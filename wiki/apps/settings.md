---
type: App
title: Settings
description: The options page — refresh interval, provider toggles, badge target, forecast toggle, export/clear.
resource: settings/index.html
timestamp: 2026-07-21
---

# Settings — `settings/`

The options page (`manifest.json` → `options_ui`, `open_in_tab:true`), reachable from the dashboard
gear. `settings/index.html` + `settings/settings.js` (149 lines) + `settings/settings.css` (reuses
`dashboard/styles.css`). **Auto-saves** on every change — no save button.

## Controls (`settings/index.html`)

- **Refresh** — 5/10/15/30/60 min (`refreshInterval`). Persisted as `refreshIntervalMinutes`.
- **Services** — `claudeEnabled` / `codexEnabled` checkboxes.
- **Icon badge** — `badgeTarget` select; the `codex-weekly` option is hidden until Codex weekly data
  exists (`codexWeeklyAvailable`, `settings/settings.js:31,45`), and options disable when their
  provider is off.
- **Trend forecast** — `showProjection` toggle. See [[trend-forecast]].
- **Data** — **Export CSV** and **Clear history** (danger, with confirm). See
  [[data-export-and-retention]].

## Behavior

- `loadSettings` (`:19`) reads storage, normalizes via `normalizeProviderSettings`
  (`lib/settings.js`), and reconciles the badge if the stored target was invalid.
- `saveSettings` (`:73`) writes settings, shows "Saving…/Saved", then re-creates the `collect-usage`
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
