import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_REFRESH_INTERVAL_MINUTES,
  normalizeProviderSettings,
  normalizeRefreshInterval
} from "../lib/settings.js";

test("accepts supported refresh intervals", () => {
  assert.equal(normalizeRefreshInterval("5"), 5);
  assert.equal(normalizeRefreshInterval(60), 60);
});

test("falls back to the default refresh interval", () => {
  assert.equal(normalizeRefreshInterval("2"), DEFAULT_REFRESH_INTERVAL_MINUTES);
  assert.equal(normalizeRefreshInterval(undefined), DEFAULT_REFRESH_INTERVAL_MINUTES);
});

test("enables both providers and Claude 5h badge by default", () => {
  assert.deepEqual(normalizeProviderSettings(), {
    providers: { claude: true, codex: true },
    badgeTarget: "claude-session",
    showProjection: true
  });
});

test("moves the badge away from a disabled provider", () => {
  assert.deepEqual(normalizeProviderSettings({ claudeEnabled: false, badgeProvider: "claude" }), {
    providers: { claude: false, codex: true },
    badgeTarget: "codex-session",
    showProjection: true
  });
  assert.equal(normalizeProviderSettings({ claudeEnabled: false, codexEnabled: false }).badgeTarget, "none");
});

test("accepts all four badge targets", () => {
  assert.equal(normalizeProviderSettings({ badgeTarget: "claude-weekly" }).badgeTarget, "claude-weekly");
  assert.equal(normalizeProviderSettings({ badgeTarget: "codex-weekly" }).badgeTarget, "codex-weekly");
});

test("allows trend projection to be disabled", () => {
  assert.equal(normalizeProviderSettings({ showProjection: false }).showProjection, false);
});
