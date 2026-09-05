---
type: App
title: Settings
description: The options page — refresh interval, provider toggles, badge target, forecast toggle, export/clear.
resource: settings/index.html
timestamp: 2026-09-05
---

# Settings — `settings/`

The options page (`manifest.json` → `options_ui`, `open_in_tab:true`), reachable from the dashboard
gear. `settings/index.html` + `settings/settings.js` (149 lines) + `settings/settings.css` (reuses
`dashboard/styles.css`). **Auto-saves** on every change — no save button.

## Controls (`settings/index.html`)

- **Refresh** — 5/10/15/30/60 min (`refreshInterval`). Persisted as `refreshIntervalMinutes`.
- **Services** — `claudeEnabled` / `codexEnabled` checkboxes. On a brand-new install these are set
  **for** the person: the first collection that reads anything switches off a provider that answered
  nothing, so an unused service never renders an empty card. See
  [[2026-09-05-first-run-provider-detection]].
- **Icon badge** — `badgeTarget` select; each Codex option is hidden until that metric has data
  (`codexMetricsAvailable`, `settings/settings.js`) — `codex-session` stays offered while there is no
  Codex data at all, since plans differ in which windows they expose
  ([[2026-07-31-codex-weekly-window-labelled-5h]]). Options disable when their provider is off.
- **Trend forecast** — `showProjection` toggle. See [[trend-forecast]].
- **Data** — **Export CSV** and **Clear history** (danger, with confirm). See
  [[data-export-and-retention]].

## Behavior

- `loadSettings` (`:19`) reads storage, normalizes via `normalizeProviderSettings`
  (`lib/settings.js`), and reconciles the badge if the stored target was invalid.
- `saveSettings` (`:73`) writes settings — including `providersInitialized: true`, which ends the
  worker's first-run provider detection so a hand-picked provider is never switched off again —
  shows "Saving…/Saved", then re-creates the `collect-usage`
  alarm with the new interval and refreshes the badge. Alarm/badge failures are swallowed — the
  worker reconciles the alarm on startup and the next collection refreshes the badge.
- `syncBadgeOptions` (`:44`) keeps the badge dropdown consistent with enabled providers + data
  availability, falling back to a valid target if the selected one becomes disabled.

## Export CSV (`:118`)

Columns: `timestamp, claude_5h_percent, claude_weekly_percent, claude_fable_percent,
codex_5h_percent, codex_weekly_percent`. One row per sample; blank cell for a missing metric. Filename
`ai-usage-YYYY-MM-DD.csv`, generated client-side via a Blob URL. (Note: Fable is exported here but is
**not** in the settings badge-target options.)

## Related
[[dashboard]] · [[background-service-worker]] · [[toolbar-badge]] · [[data-export-and-retention]]
