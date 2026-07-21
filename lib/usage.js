export const HISTORY_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

const numberOrNull = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const percent = (value) => {
  const number = numberOrNull(value);
  if (number === null) return null;
  const normalized = number > 0 && number <= 1 ? number * 100 : number;
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
  const session = limits.primary_window ?? limits.primaryWindow ?? limits.primary ?? limits.five_hour ?? limits.session;
  const weekly = limits.secondary_window ?? limits.secondaryWindow ?? limits.secondary ?? limits.seven_day ?? limits.weekly;
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

export function findOrganizationId(data) {
  const queue = Array.isArray(data) ? [...data] : [data];
  const fallbackIds = [];
  while (queue.length) {
    const value = queue.shift();
    if (!value || typeof value !== "object") continue;
    for (const [key, child] of Object.entries(value)) {
      if (typeof child === "string" && /^(organization_id|organization_uuid|org_id)$/i.test(key)) return child;
      if (key === "organization" && child && typeof child === "object" && typeof child.uuid === "string") return child.uuid;
      if (typeof child === "string" && key === "uuid") fallbackIds.push(child);
      if (child && typeof child === "object") queue.push(child);
    }
  }
  return fallbackIds[0] ?? null;
}

export function appendSample(history, sample, now = Date.now()) {
  const cutoff = now - HISTORY_RETENTION_MS;
  return [...(Array.isArray(history) ? history : []), sample]
    .filter((item) => Number(item?.timestamp) >= cutoff)
    .sort((a, b) => a.timestamp - b.timestamp);
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
