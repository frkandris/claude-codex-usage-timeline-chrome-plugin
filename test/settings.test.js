import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BADGE_TARGETS,
  DEFAULT_RANGE,
  DEFAULT_REFRESH_INTERVAL_MINUTES,
  RANGE_DURATIONS_MS,
  firstRunProviderSettings,
  normalizeProviderSettings,
  normalizeRange,
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

test("turns off the provider a first install could not read, and moves the badge", () => {
  assert.deepEqual(firstRunProviderSettings({}, { claude: true, codex: false }), {
    providers: { claude: true, codex: false },
    badgeTarget: "claude-session",
    showProjection: true
  });
  assert.deepEqual(firstRunProviderSettings({}, { claude: false, codex: true }), {
    providers: { claude: false, codex: true },
    badgeTarget: "codex-session",
    showProjection: true
  });
});

test("settles the question without changing anything when both providers answered", () => {
  assert.deepEqual(firstRunProviderSettings({}, { claude: true, codex: true }), {
    providers: { claude: true, codex: true },
    badgeTarget: "claude-session",
    showProjection: true
  });
});

test("decides nothing while no provider has been read yet", () => {
  assert.equal(firstRunProviderSettings({}, { claude: false, codex: false }), null);
});

// The first collection can still be waiting on the network when someone saves the settings page, and
// that save sets `providersInitialized`. Without this guard the late write would roll their choice back.
test("decides nothing once the question is settled", () => {
  const stored = { providersInitialized: true, claudeEnabled: true, codexEnabled: true };
  assert.equal(firstRunProviderSettings(stored, { claude: true, codex: false }), null);
});

test("keeps the rest of the settings when a first install drops a provider", () => {
  const result = firstRunProviderSettings(
    { claudeEnabled: false, codexEnabled: true, badgeTarget: "codex-weekly", showProjection: false },
    { claude: true, codex: false }
  );
  // Claude answered but was already switched off by hand, so nothing is left to badge.
  assert.deepEqual(result, {
    providers: { claude: false, codex: false },
    badgeTarget: "none",
    showProjection: false
  });
});

test("accepts every offered chart range", () => {
  for (const range of [...RANGE_DURATIONS_MS.keys(), "all"]) {
    assert.equal(normalizeRange(range), range);
  }
});

test("maps the retired 48h range onto the two-day option", () => {
  assert.equal(normalizeRange("48h"), "2");
});

test("falls back to one day for an unknown chart range", () => {
  assert.equal(normalizeRange("99d"), DEFAULT_RANGE);
  assert.equal(normalizeRange(undefined), DEFAULT_RANGE);
});

test("measures each day range as that many days", () => {
  const day = 24 * 60 * 60 * 1000;
  for (const days of [1, 2, 3, 4, 5, 6, 7, 30]) {
    assert.equal(RANGE_DURATIONS_MS.get(String(days)), days * day);
  }
});

// There is no build step tying the option lists to `lib/settings.js`, so the two are edited by hand
// and can drift apart silently — a dropdown value the code does not know falls back to a default,
// and a value the code knows but the markup omits is simply unreachable.
const optionValues = (path, selectId) => {
  const markup = readFileSync(new URL(path, import.meta.url), "utf8");
  const select = new RegExp(`<select id="${selectId}"[^>]*>([\\s\\S]*?)</select>`).exec(markup);
  assert.ok(select, `no <select id="${selectId}"> in ${path}`);
  return [...select[1].matchAll(/value="([^"]*)"/g)].map(([, value]) => value);
};

test("the chart range dropdown offers exactly the ranges the code knows", () => {
  assert.deepEqual(
    optionValues("../dashboard/index.html", "rangeSelect"),
    [...RANGE_DURATIONS_MS.keys(), "all"]
  );
});

test("the badge dropdown offers exactly the badge targets the code knows", () => {
  assert.deepEqual(optionValues("../settings/index.html", "badgeTarget"), [...BADGE_TARGETS]);
});
