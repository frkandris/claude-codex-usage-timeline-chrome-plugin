export const DEFAULT_REFRESH_INTERVAL_MINUTES = 15;
export const ALLOWED_REFRESH_INTERVALS = Object.freeze([5, 10, 15, 30, 60]);
export const DEFAULT_BADGE_TARGET = "claude-session";
export const BADGE_TARGETS = Object.freeze([
  "claude-session",
  "claude-weekly",
  "codex-session",
  "codex-weekly",
  "none"
]);

// How far back the chart looks, keyed by the value stored as `selectedRange`. Hour ranges keep an
// `h` suffix; day ranges are bare numbers.
export const RANGE_DURATIONS_MS = new Map([
  ["30m", 30 * 60 * 1000],
  ["1h", 60 * 60 * 1000],
  ["2h", 2 * 60 * 60 * 1000],
  ["3h", 3 * 60 * 60 * 1000],
  ["4h", 4 * 60 * 60 * 1000],
  ["6h", 6 * 60 * 60 * 1000],
  ["12h", 12 * 60 * 60 * 1000],
  ["1", 24 * 60 * 60 * 1000],
  ["2", 2 * 24 * 60 * 60 * 1000],
  ["3", 3 * 24 * 60 * 60 * 1000],
  ["4", 4 * 24 * 60 * 60 * 1000],
  ["5", 5 * 24 * 60 * 60 * 1000],
  ["6", 6 * 24 * 60 * 60 * 1000],
  ["7", 7 * 24 * 60 * 60 * 1000],
  ["30", 30 * 24 * 60 * 60 * 1000]
]);
export const DEFAULT_RANGE = "1";
// "all" has no duration — it means every sample kept.
const RANGES = new Set([...RANGE_DURATIONS_MS.keys(), "all"]);
// The two-day range was stored as `48h` until it joined the day options on 2026-09-05; without this
// alias a selection saved back then would leave the dropdown blank.
const LEGACY_RANGES = new Map([["48h", "2"]]);

export function normalizeRange(value) {
  const range = LEGACY_RANGES.get(value) ?? value;
  return RANGES.has(range) ? range : DEFAULT_RANGE;
}

export function normalizeRefreshInterval(value) {
  const interval = Number(value);
  return ALLOWED_REFRESH_INTERVALS.includes(interval)
    ? interval
    : DEFAULT_REFRESH_INTERVAL_MINUTES;
}

export function normalizeProviderSettings(settings = {}) {
  const providers = {
    claude: settings.claudeEnabled !== false,
    codex: settings.codexEnabled !== false
  };
  const legacyTarget = ["claude", "codex"].includes(settings.badgeProvider)
    ? `${settings.badgeProvider}-session`
    : settings.badgeProvider === "none" ? "none" : null;
  const requestedBadge = BADGE_TARGETS.includes(settings.badgeTarget)
    ? settings.badgeTarget
    : legacyTarget ?? DEFAULT_BADGE_TARGET;
  const requestedProvider = requestedBadge.split("-")[0];
  const badgeTarget = requestedBadge === "none" || providers[requestedProvider]
    ? requestedBadge
    : providers.claude
      ? "claude-session"
      : providers.codex
        ? "codex-session"
        : "none";
  return { providers, badgeTarget, showProjection: settings.showProjection !== false };
}

// A fresh install offers both providers and aims the badge at Claude, but most people are signed in
// to only one of the two. The first collection that reads anything settles it: the provider that
// answered nothing is switched off — it would otherwise render an empty card, an empty chart line
// and a permanent "!" on the badge — and the badge follows the provider that stayed, Claude first.
//
// `stored` is the raw stored settings, `presence` says which providers the sample could be read from.
// Returns the settings to persist (the caller records `providersInitialized` alongside them), or null
// when the question is not this collection's to answer: already settled by an earlier collection or
// by an explicit save, or nothing read yet — in which case the next collection asks again.
export function firstRunProviderSettings(stored, presence) {
  if (stored?.providersInitialized) return null;
  const detected = { claude: Boolean(presence?.claude), codex: Boolean(presence?.codex) };
  if (!detected.claude && !detected.codex) return null;
  const current = normalizeProviderSettings(stored);
  // Both answered: nothing to switch off, but the question is settled all the same.
  if (detected.claude && detected.codex) return current;
  return normalizeProviderSettings({
    ...stored,
    claudeEnabled: current.providers.claude && detected.claude,
    codexEnabled: current.providers.codex && detected.codex,
    // A disabled provider moves the badge on by itself, in the same Claude → Codex order.
    badgeTarget: detected.claude ? "claude-session" : "codex-session"
  });
}
