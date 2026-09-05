export const HISTORY_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

const numberOrNull = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const percent = (value) => {
  const number = numberOrNull(value);
  if (number === null) return null;
  const normalized = number > 0 && number < 1 ? number * 100 : number;
  return Math.max(0, Math.min(100, normalized));
};

const resetTime = (window) => {
  if (!window || typeof window !== "object") return null;
  const direct = window.resets_at ?? window.reset_at ?? window.resetAt;
  if (direct) {
    const timestamp = typeof direct === "number" && direct < 1e12 ? direct * 1000 : Date.parse(direct) || Number(direct);
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  const seconds = numberOrNull(window.reset_after_seconds ?? window.resetAfterSeconds);
  return seconds === null ? null : Date.now() + seconds * 1000;
};

const CODEX_SESSION_WINDOW_MAX_MS = 24 * 60 * 60 * 1000;

const windowLengthSeconds = (window) => {
  if (!window || typeof window !== "object") return null;
  const seconds = numberOrNull(window.limit_window_seconds ?? window.limitWindowSeconds ?? window.window_seconds ?? window.windowSeconds);
  if (seconds !== null) return seconds;
  const minutes = numberOrNull(window.limit_window_minutes ?? window.limitWindowMinutes ?? window.window_minutes ?? window.windowMinutes);
  return minutes === null ? null : minutes * 60;
};

const metric = (window) => {
  if (!window || typeof window !== "object") return { used: null, resetsAt: null };
  return {
    used: percent(window.utilization ?? window.used_percent ?? window.usedPercent ?? window.percentage ?? window.percent),
    resetsAt: resetTime(window)
  };
};

const findNamedMetric = (data, name) => {
  const queue = [data];
  while (queue.length) {
    const value = queue.shift();
    if (!value || typeof value !== "object") continue;
    for (const [key, child] of Object.entries(value)) {
      if (child && typeof child === "object") {
        const identity = [key, child.name, child.label, child.model, child.limit_id, child.scope?.model?.display_name, child.scope?.model?.id]
          .filter((part) => typeof part === "string")
          .join(" ");
        if (new RegExp(name, "i").test(identity) && metric(child).used !== null) return child;
        queue.push(child);
      }
    }
  }
  return null;
};

export function parseClaudeUsage(data) {
  if (!data || typeof data !== "object") throw new Error("The Claude usage response is empty.");
  const session = data.five_hour ?? data.current_session ?? data.session;
  const weekly = data.seven_day ?? data.weekly ?? data.seven_day_all_models;
  const fable = data.seven_day_fable ?? data.fable ?? data.fable_weekly ??
    data.weekly_fable ?? data.model_limits?.fable ?? data.seven_day_by_model?.fable ??
    findNamedMetric(data, "fable");
  const parsed = { session: metric(session), weekly: metric(weekly), fable: metric(fable) };
  if (parsed.session.used === null && parsed.weekly.used === null && parsed.fable.used === null) {
    throw new Error("The Claude usage format is not recognized.");
  }
  return parsed;
}

export function parseCodexUsage(data) {
  if (!data || typeof data !== "object") throw new Error("The Codex usage response is empty.");
  const preferredLimit = Array.isArray(data.rate_limits)
    ? data.rate_limits.find((item) => item?.limit_id === "codex") ?? data.rate_limits[0]
    : null;
  const limits = data.rate_limit ?? data.rateLimit ?? preferredLimit?.rate_limit ?? preferredLimit ?? data;
  const primary = limits.primary_window ?? limits.primaryWindow ?? limits.primary ?? limits.five_hour ?? limits.session;
  const secondary = limits.secondary_window ?? limits.secondaryWindow ?? limits.secondary ?? limits.seven_day ?? limits.weekly;
  // The window position is not the window length: on some plans the only window ChatGPT returns is
  // `primary_window` with `limit_window_seconds: 604800` — a weekly limit. Classify by declared
  // length when it is present, and fall back to the position when it is not.
  let session = primary;
  let weekly = secondary;
  for (const window of [primary, secondary]) {
    const seconds = windowLengthSeconds(window);
    if (seconds === null) continue;
    if (seconds * 1000 <= CODEX_SESSION_WINDOW_MAX_MS) {
      session = window;
      if (weekly === window) weekly = null;
    } else {
      weekly = window;
      if (session === window) session = null;
    }
  }
  const parsed = { session: metric(session), weekly: metric(weekly) };
  if (parsed.session.used === null && parsed.weekly.used === null) {
    throw new Error("The Codex usage format is not recognized.");
  }
  return parsed;
}

function jwtPayload(token) {
  if (typeof token !== "string") return null;
  try {
    const encoded = token.split(".")[1];
    if (!encoded) return null;
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function extractChatGptAccountId(session) {
  if (!session || typeof session !== "object") return null;
  const direct = session.accountId ?? session.account_id ?? session.account?.id ?? session.user?.account_id;
  if (typeof direct === "string" && direct) return direct;
  for (const token of [session.idToken, session.id_token, session.accessToken, session.access_token]) {
    const payload = jwtPayload(token);
    const auth = payload?.["https://api.openai.com/auth"] ?? payload?.["https://api.openai.com/auth/"];
    const accountId = auth?.chatgpt_account_id ?? payload?.chatgpt_account_id;
    if (typeof accountId === "string" && accountId) return accountId;
  }
  return null;
}

// An account can belong to several organizations (a personal one plus one per team), and only some of
// them carry the usage the person actually spends. Return every candidate, best guess first, so the
// caller can try them instead of betting on one.
export function findOrganizationIds(data, limit = 5) {
  const queue = Array.isArray(data) ? [...data] : [data];
  const explicitIds = [];
  const chatOrganizationIds = [];
  const fallbackIds = [];
  while (queue.length) {
    const value = queue.shift();
    if (!value || typeof value !== "object") continue;
    if (typeof value.uuid === "string" && Array.isArray(value.capabilities) && value.capabilities.includes("chat")) {
      chatOrganizationIds.push(value.uuid);
    }
    for (const [key, child] of Object.entries(value)) {
      if (typeof child === "string" && /^(organization_id|organization_uuid|org_id)$/i.test(key)) explicitIds.push(child);
      if (key === "organization" && child && typeof child === "object" && typeof child.uuid === "string") explicitIds.push(child.uuid);
      if (typeof child === "string" && key === "uuid") fallbackIds.push(child);
      if (child && typeof child === "object") queue.push(child);
    }
  }
  return [...new Set([...explicitIds, ...chatOrganizationIds, ...fallbackIds])].slice(0, limit);
}

export function findOrganizationId(data) {
  return findOrganizationIds(data, 1)[0] ?? null;
}

// True when a parsed reading carries any evidence of a real limit: usage above zero, or a reset time.
// An organization the person never uses answers with zeroes and no reset — indistinguishable from a
// broken read until compared against the other organizations.
export function hasLiveUsage(parsed) {
  return ["session", "weekly", "fable"].some((name) =>
    Number(parsed?.[name]?.used) > 0 || Number.isFinite(parsed?.[name]?.resetsAt));
}

// True when a provider's slice of a sample carries at least one number. A collection that failed
// stores `null` for the provider, so this separates "the account has no such service" from "the
// service answered, with zeroes". See `firstRunProviderSettings` (`lib/settings.js`).
export function hasReading(providerSample) {
  return Object.values(providerSample ?? {}).some((measurement) => Number.isFinite(measurement?.used));
}

export function appendSample(history, sample, now = Date.now()) {
  const cutoff = now - HISTORY_RETENTION_MS;
  return [...(Array.isArray(history) ? history : []), sample]
    .filter((item) => Number(item?.timestamp) >= cutoff)
    .sort((a, b) => a.timestamp - b.timestamp);
}

// Samples collected before 2026-07-31 stored every Codex `primary_window` as `session`, even when the
// window was a weekly one. A reset more than a day out can only have come from a weekly window, so
// those measurements are relabelled in place. Returns the same array when nothing needed moving.
export function migrateCodexWindows(history) {
  if (!Array.isArray(history)) return [];
  // A window keeps one reset timestamp for its whole span, so a reset more than a day after *any*
  // sample marks that timestamp as weekly — including for the samples taken in its final hours,
  // whose own remaining time would otherwise look like a short window.
  // Samples the new parser already classified correctly seed the set too, so a window whose legacy
  // samples were *all* taken in its last 24 hours is still recognised once one correct sample exists.
  const weeklyResets = new Set();
  for (const sample of history) {
    const weekly = sample?.codex?.weekly;
    if (Number.isFinite(weekly?.used) && Number.isFinite(weekly?.resetsAt)) weeklyResets.add(weekly.resetsAt);
    const session = sample?.codex?.session;
    if (!Number.isFinite(session?.used) || !Number.isFinite(session?.resetsAt)) continue;
    if (session.resetsAt - sample.timestamp > CODEX_SESSION_WINDOW_MAX_MS) weeklyResets.add(session.resetsAt);
  }
  const horizon = (metric) => Number.isFinite(metric?.used) && Number.isFinite(metric?.resetsAt) ? metric.resetsAt : null;
  let changed = false;
  const migrated = history.map((sample) => {
    const session = sample?.codex?.session;
    const weekly = sample?.codex?.weekly;
    if (!Number.isFinite(session?.used)) return sample;
    // Both windows stored, but each contradicts its own label: the old parser read a payload that
    // put the weekly window first. Swap rather than drop — both readings are real.
    const sessionReset = horizon(session);
    const weeklyReset = horizon(weekly);
    if (sessionReset !== null && weeklyReset !== null
      && sessionReset - sample.timestamp > CODEX_SESSION_WINDOW_MAX_MS
      && weeklyReset - sample.timestamp <= CODEX_SESSION_WINDOW_MAX_MS) {
      changed = true;
      return { ...sample, codex: { ...sample.codex, session: weekly, weekly: session } };
    }
    if (Number.isFinite(weekly?.used)) return sample;
    if (!weeklyResets.has(session.resetsAt)) return sample;
    changed = true;
    return { ...sample, codex: { ...sample.codex, session: { used: null, resetsAt: null }, weekly: session } };
  });
  return changed ? migrated : history;
}

export function removeMeasurement(history, timestamp, provider, metricName) {
  if (!Array.isArray(history)) return [];
  return history.flatMap((sample) => {
    if (sample?.timestamp !== timestamp || !sample?.[provider]?.[metricName]) return [sample];
    const providerData = { ...sample[provider] };
    delete providerData[metricName];
    const updated = { ...sample, [provider]: Object.keys(providerData).length ? providerData : null };
    const hasMeasurements = ["claude", "codex"].some((name) =>
      Object.values(updated[name] ?? {}).some((measurement) => Number.isFinite(measurement?.used))
    );
    return hasMeasurements ? [updated] : [];
  });
}

export function projectUsage(data, provider, metricName, now = Date.now()) {
  const points = data
    .map((sample) => ({
      timestamp: sample.timestamp,
      value: sample[provider]?.[metricName]?.used,
      resetsAt: sample[provider]?.[metricName]?.resetsAt
    }))
    .filter((point) => Number.isFinite(point.value));
  if (points.length < 3) return null;

  let segmentStart = 0;
  for (let index = 1; index < points.length; index += 1) {
    if (points[index].value < points[index - 1].value - 8) segmentStart = index;
  }
  const recent = points.slice(segmentStart).slice(-8);
  if (recent.length < 3) return null;

  const origin = recent[0].timestamp;
  const normalized = recent.map((point) => ({ x: point.timestamp - origin, y: point.value }));
  const meanX = normalized.reduce((sum, point) => sum + point.x, 0) / normalized.length;
  const meanY = normalized.reduce((sum, point) => sum + point.y, 0) / normalized.length;
  const variance = normalized.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
  if (!variance) return null;
  const slope = normalized.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0) / variance;
  const last = recent.at(-1);
  if (last.value >= 100) return null;

  const exhaustsAt = slope > 0 ? last.timestamp + (100 - last.value) / slope : Infinity;
  const resetAt = Number(last.resetsAt) > last.timestamp ? Number(last.resetsAt) : Infinity;
  const targetTimestamp = Math.min(exhaustsAt, resetAt);
  if (!Number.isFinite(targetTimestamp) || targetTimestamp <= Math.max(last.timestamp, now)) return null;
  return {
    last,
    slope,
    targetTimestamp,
    targetValue: Math.max(0, Math.min(100, last.value + slope * (targetTimestamp - last.timestamp))),
    targetReason: exhaustsAt <= resetAt ? "limit" : "reset"
  };
}
