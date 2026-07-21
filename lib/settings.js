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
