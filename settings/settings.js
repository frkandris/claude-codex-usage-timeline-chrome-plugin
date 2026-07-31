import {
  DEFAULT_REFRESH_INTERVAL_MINUTES,
  normalizeProviderSettings,
  normalizeRefreshInterval
} from "../lib/settings.js";

const intervalSelect = document.getElementById("refreshInterval");
const saveStatus = document.getElementById("saveStatus");
const claudeEnabled = document.getElementById("claudeEnabled");
const codexEnabled = document.getElementById("codexEnabled");
const badgeTarget = document.getElementById("badgeTarget");
const showProjection = document.getElementById("showProjection");
const exportButton = document.getElementById("exportButton");
const clearButton = document.getElementById("clearButton");
const ALARM_NAME = "collect-usage";
let statusTimer;
const codexMetricsAvailable = { session: true, weekly: false };

async function loadSettings() {
  const stored = await chrome.storage.local.get([
    "refreshIntervalMinutes",
    "claudeEnabled",
    "codexEnabled",
    "badgeProvider",
    "badgeTarget",
    "showProjection",
    "history"
  ]);
  const providerSettings = normalizeProviderSettings(stored);
  const latestCodex = [...(stored.history ?? [])].reverse().find((sample) => sample?.codex)?.codex;
  codexMetricsAvailable.weekly = Number.isFinite(latestCodex?.weekly?.used);
  // Plans without a 5-hour Codex window only report a weekly one; keep the 5-hour target offered
  // while no Codex data exists at all.
  codexMetricsAvailable.session = Number.isFinite(latestCodex?.session?.used) || !codexMetricsAvailable.weekly;
  intervalSelect.value = String(normalizeRefreshInterval(stored.refreshIntervalMinutes));
  claudeEnabled.checked = providerSettings.providers.claude;
  codexEnabled.checked = providerSettings.providers.codex;
  badgeTarget.value = providerSettings.badgeTarget;
  showProjection.checked = providerSettings.showProjection;
  syncBadgeOptions();
  if (badgeTarget.value !== providerSettings.badgeTarget) {
    await chrome.storage.local.set({ badgeTarget: badgeTarget.value });
    await updateBadgeFromHistory(badgeTarget.value);
  }
}

function syncBadgeOptions() {
  badgeTarget.querySelectorAll("option[data-provider]").forEach((option) => {
    const unavailableMetric = option.dataset.provider === "codex"
      && !codexMetricsAvailable[option.value.split("-")[1]];
    option.hidden = unavailableMetric;
    option.disabled = unavailableMetric || (option.dataset.provider === "claude" ? !claudeEnabled.checked : !codexEnabled.checked);
  });
  if (badgeTarget.selectedOptions[0]?.disabled) {
    const codexFallback = codexMetricsAvailable.session ? "codex-session" : "codex-weekly";
    badgeTarget.value = claudeEnabled.checked ? "claude-session" : codexEnabled.checked ? codexFallback : "none";
  }
}

async function updateBadgeFromHistory(badgeValue) {
  if (!chrome.action?.setBadgeText) return;
  if (badgeValue === "none") {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }
  const [provider, metric] = badgeValue.split("-");
  const { history = [] } = await chrome.storage.local.get(["history"]);
  const sample = [...history].reverse().find((item) => item?.[provider]);
  const value = sample?.[provider]?.[metric]?.used;
  await chrome.action.setBadgeText({ text: Number.isFinite(value) ? `${Math.round(value)}` : "!" });
  await chrome.action.setBadgeBackgroundColor({
    color: Number.isFinite(value) && value >= 80
      ? "#D05A42"
      : provider === "claude" ? "#BD654B" : "#3F7766"
  });
}

async function saveSettings() {
  clearTimeout(statusTimer);
  saveStatus.classList.remove("error");
  saveStatus.textContent = "Saving…";
  try {
    const intervalMinutes = normalizeRefreshInterval(intervalSelect.value);
    const providerSettings = normalizeProviderSettings({
      claudeEnabled: claudeEnabled.checked,
      codexEnabled: codexEnabled.checked,
      badgeTarget: badgeTarget.value,
      showProjection: showProjection.checked
    });
    await chrome.storage.local.set({
      refreshIntervalMinutes: intervalMinutes,
      claudeEnabled: providerSettings.providers.claude,
      codexEnabled: providerSettings.providers.codex,
      badgeTarget: providerSettings.badgeTarget,
      showProjection: providerSettings.showProjection
    });
    saveStatus.textContent = "Saved";
    statusTimer = setTimeout(() => { saveStatus.textContent = ""; }, 1600);
    try {
      await chrome.alarms?.clear(ALARM_NAME);
      await chrome.alarms?.create(ALARM_NAME, { delayInMinutes: intervalMinutes, periodInMinutes: intervalMinutes });
    } catch { /* The background worker will reconcile the alarm on startup. */ }
    try {
      await updateBadgeFromHistory(providerSettings.badgeTarget);
    } catch { /* The next usage collection will refresh the badge. */ }
  } catch (error) {
    saveStatus.classList.add("error");
    saveStatus.textContent = error.message || "Settings could not be saved.";
  }
}

intervalSelect.addEventListener("change", () => {
  saveSettings();
});

for (const input of [claudeEnabled, codexEnabled, badgeTarget, showProjection]) {
  input.addEventListener("change", () => {
    syncBadgeOptions();
    saveSettings();
  });
}

exportButton.addEventListener("click", async () => {
  const { history = [] } = await chrome.storage.local.get(["history"]);
  const rows = [["timestamp", "claude_5h_percent", "claude_weekly_percent", "claude_fable_percent", "codex_5h_percent", "codex_weekly_percent"]];
  history.forEach((sample) => rows.push([
    new Date(sample.timestamp).toISOString(),
    sample.claude?.session?.used ?? "",
    sample.claude?.weekly?.used ?? "",
    sample.claude?.fable?.used ?? "",
    sample.codex?.session?.used ?? "",
    sample.codex?.weekly?.used ?? ""
  ]));
  const blob = new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `ai-usage-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
});

clearButton.addEventListener("click", async () => {
  if (!confirm("Clear all locally stored usage history?")) return;
  clearTimeout(statusTimer);
  await chrome.storage.local.set({ history: [] });
  saveStatus.classList.remove("error");
  saveStatus.textContent = "History cleared";
});

loadSettings().catch(() => {
  intervalSelect.value = String(DEFAULT_REFRESH_INTERVAL_MINUTES);
  saveStatus.classList.add("error");
  saveStatus.textContent = "Settings could not be loaded.";
});
