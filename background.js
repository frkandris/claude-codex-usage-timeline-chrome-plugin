import {
  appendSample,
  extractChatGptAccountId,
  findOrganizationId,
  parseClaudeUsage,
  parseCodexUsage
} from "./lib/usage.js";
import { normalizeProviderSettings, normalizeRefreshInterval } from "./lib/settings.js";

const ALARM_NAME = "collect-usage";
const DASHBOARD_URL = chrome.runtime.getURL("dashboard/index.html");

async function fetchJson(url, options = {}) {
  const response = await fetch(url, { ...options, credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function collectClaudeDirect() {
  let organizationData;
  try {
    organizationData = await fetchJson("https://claude.ai/api/organizations");
  } catch {
    organizationData = await fetchJson("https://claude.ai/api/bootstrap");
  }
  const organizationId = findOrganizationId(organizationData);
  if (!organizationId) throw new Error("Claude organization ID not found.");
  return parseClaudeUsage(await fetchJson(`https://claude.ai/api/organizations/${organizationId}/usage`));
}

async function collectCodexDirect() {
  const session = await fetchJson("https://chatgpt.com/api/auth/session");
  const accessToken = session.accessToken ?? session.access_token;
  if (!accessToken) throw new Error("The ChatGPT session has no access token.");
  const headers = { Authorization: `Bearer ${accessToken}` };
  const accountId = extractChatGptAccountId(session);
  if (accountId) headers["ChatGPT-Account-Id"] = accountId;
  return parseCodexUsage(await fetchJson("https://chatgpt.com/backend-api/wham/usage", { headers }));
}

function waitForTab(tabId, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error("The background page timed out.")), timeoutMs);
    const finish = (error) => {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      error ? reject(error) : resolve();
    };
    const listener = (updatedId, info) => {
      if (updatedId === tabId && info.status === "complete") finish();
    };
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId).then((tab) => tab.status === "complete" && finish()).catch(finish);
  });
}

async function collectInBackgroundTab(provider) {
  const isClaude = provider === "claude";
  const tab = await chrome.tabs.create({
    url: isClaude ? "https://claude.ai/new" : "https://chatgpt.com/codex",
    active: false
  });
  try {
    await waitForTab(tab.id);
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      args: [isClaude],
      func: async (claude) => {
        const read = async (url, options = {}) => {
          const response = await fetch(url, { ...options, credentials: "include", cache: "no-store" });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        };
        if (!claude) {
          const session = await read("/api/auth/session");
          const accessToken = session.accessToken || session.access_token;
          if (!accessToken) throw new Error("The ChatGPT session has no access token.");
          const decode = (token) => {
            try {
              const encoded = token.split(".")[1];
              const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
              return JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
            } catch { return null; }
          };
          const payload = decode(session.idToken || session.id_token) || decode(accessToken);
          const auth = payload?.["https://api.openai.com/auth"] || payload?.["https://api.openai.com/auth/"];
          const accountId = session.accountId || session.account_id || session.account?.id || auth?.chatgpt_account_id || payload?.chatgpt_account_id;
          const headers = { Authorization: `Bearer ${accessToken}` };
          if (accountId) headers["ChatGPT-Account-Id"] = accountId;
          return read("/backend-api/wham/usage", { headers });
        }
        let organizations;
        try { organizations = await read("/api/organizations"); }
        catch { organizations = await read("/api/bootstrap"); }
        const queue = Array.isArray(organizations) ? [...organizations] : [organizations];
        let id = null;
        while (queue.length && !id) {
          const item = queue.shift();
          if (!item || typeof item !== "object") continue;
          id = item.organization_id || item.organization_uuid || item.org_id || item.organization?.uuid || item.uuid || null;
          Object.values(item).forEach((value) => value && typeof value === "object" && queue.push(value));
        }
        if (!id) throw new Error("Claude organization ID not found.");
        return read(`/api/organizations/${id}/usage`);
      }
    });
    return isClaude ? parseClaudeUsage(result) : parseCodexUsage(result);
  } finally {
    if (tab?.id) await chrome.tabs.remove(tab.id).catch(() => {});
  }
}

async function collectProvider(provider, directCollector) {
  try {
    return { data: await directCollector(), error: null, source: "direct" };
  } catch (directError) {
    try {
      return { data: await collectInBackgroundTab(provider), error: null, source: "background-tab" };
    } catch (tabError) {
      return { data: null, error: `${tabError.message} (direct request: ${directError.message})`, source: null };
    }
  }
}

async function updateBadge(sample, badgeTarget) {
  if (badgeTarget === "none") {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }
  const [provider, metric] = badgeTarget.split("-");
  const value = sample?.[provider]?.[metric]?.used;
  await chrome.action.setBadgeText({ text: Number.isFinite(value) ? `${Math.round(value)}` : "!" });
  await chrome.action.setBadgeBackgroundColor({
    color: Number.isFinite(value) && value >= 80
      ? "#D05A42"
      : provider === "claude" ? "#BD654B" : "#3F7766"
  });
}

async function updateBadgeFromHistory(settings) {
  const { history = [] } = await chrome.storage.local.get(["history"]);
  const provider = settings.badgeTarget.split("-")[0];
  const latest = settings.badgeTarget === "none"
    ? null
    : [...history].reverse().find((sample) => sample?.[provider]);
  await updateBadge(latest, settings.badgeTarget);
}

async function collectUsage() {
  const timestamp = Date.now();
  const storedSettings = await chrome.storage.local.get([
    "claudeEnabled", "codexEnabled", "badgeProvider", "badgeTarget", "showProjection"
  ]);
  const settings = normalizeProviderSettings(storedSettings);
  const [claude, codex] = await Promise.all([
    settings.providers.claude
      ? collectProvider("claude", collectClaudeDirect)
      : Promise.resolve({ data: null, error: null, source: null, enabled: false }),
    settings.providers.codex
      ? collectProvider("codex", collectCodexDirect)
      : Promise.resolve({ data: null, error: null, source: null, enabled: false })
  ]);
  const sample = {
    timestamp,
    claude: claude.data,
    codex: codex.data
  };
  const stored = await chrome.storage.local.get(["history"]);
  const hasEnabledProvider = settings.providers.claude || settings.providers.codex;
  const history = hasEnabledProvider ? appendSample(stored.history, sample, timestamp) : (stored.history ?? []);
  await chrome.storage.local.set({
    history,
    status: {
      lastAttempt: timestamp,
      claude: { enabled: settings.providers.claude, ok: Boolean(claude.data), error: claude.error, source: claude.source },
      codex: { enabled: settings.providers.codex, ok: Boolean(codex.data), error: codex.error, source: codex.source }
    }
  });
  await updateBadge(sample, settings.badgeTarget);
  return { sample, status: { claude, codex } };
}

async function scheduleAlarm(intervalMinutes, delayInMinutes = intervalMinutes) {
  await chrome.alarms.clear(ALARM_NAME);
  await chrome.alarms.create(ALARM_NAME, { delayInMinutes, periodInMinutes: intervalMinutes });
  return chrome.alarms.get(ALARM_NAME);
}

async function ensureAlarm() {
  const stored = await chrome.storage.local.get(["refreshIntervalMinutes"]);
  const interval = normalizeRefreshInterval(stored.refreshIntervalMinutes);
  if (stored.refreshIntervalMinutes !== interval) {
    await chrome.storage.local.set({ refreshIntervalMinutes: interval });
  }
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (!existing) return scheduleAlarm(interval, 0.1);
  if (existing.periodInMinutes !== interval) return scheduleAlarm(interval);
  return existing;
}

async function openDashboard() {
  const tabs = await chrome.tabs.query({});
  const dashboardTab = tabs.find((tab) => tab.url?.startsWith(DASHBOARD_URL));
  if (dashboardTab) {
    await chrome.tabs.update(dashboardTab.id, { active: true });
    if (dashboardTab.windowId) await chrome.windows.update(dashboardTab.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: DASHBOARD_URL });
  }
}

chrome.runtime.onInstalled.addListener(() => ensureAlarm());
chrome.runtime.onStartup.addListener(() => ensureAlarm());
chrome.alarms.onAlarm.addListener((alarm) => alarm.name === ALARM_NAME && collectUsage());
chrome.action.onClicked.addListener(openDashboard);
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "collect-now") {
    collectUsage().then((result) => sendResponse({ ok: true, result })).catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === "update-settings") {
    const intervalMinutes = normalizeRefreshInterval(message.intervalMinutes);
    const providerSettings = normalizeProviderSettings(message);
    scheduleAlarm(intervalMinutes)
      .then(async (alarm) => {
        await chrome.storage.local.set({
          refreshIntervalMinutes: intervalMinutes,
          claudeEnabled: providerSettings.providers.claude,
          codexEnabled: providerSettings.providers.codex,
          badgeTarget: providerSettings.badgeTarget,
          showProjection: providerSettings.showProjection
        });
        await updateBadgeFromHistory(providerSettings);
        sendResponse({
          ok: true,
          intervalMinutes,
          ...providerSettings,
          scheduledTime: alarm?.scheduledTime
        });
      })
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  return false;
});

ensureAlarm();
