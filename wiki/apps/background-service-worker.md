---
type: App
title: Background service worker
description: The MV3 service worker that collects usage, schedules the alarm, stores history, and paints the badge.
resource: background.js
timestamp: 2026-07-21
---

# Background service worker — `background.js`

The extension's engine. MV3 service worker (`manifest.json` → `background.service_worker`,
`"type":"module"`). No UI. Responsibilities: run the collection cycle, keep the `chrome.alarms`
schedule, own `chrome.storage.local`, paint the toolbar badge, and answer messages from the UI.

## Entry points / event wiring (`background.js:213`)

- `onInstalled` / `onStartup` → `ensureAlarm()` — create/reconcile the `collect-usage` alarm from the
  stored interval.
- `alarms.onAlarm` (`collect-usage`) → `collectUsage()`.
- `action.onClicked` → `openDashboard()` — focus the existing dashboard tab or open one.
- `runtime.onMessage`:
  - `collect-now` → `collectUsage()` (the dashboard refresh button).
  - `update-settings` → reschedule the alarm, persist settings, refresh the badge.
- A bare `ensureAlarm()` at module load (`background.js:248`) covers worker respawns.

## Collection cycle (`collectUsage`, `background.js:150`)

1. Read settings; normalize with `normalizeProviderSettings` (`lib/settings.js`).
2. Collect both providers **in parallel** (`Promise.all`), each via `collectProvider` — but only if
   enabled; a disabled provider resolves to `{ data:null }`.
3. Build one sample `{ timestamp, claude, codex }`, append with `appendSample` (`lib/usage.js:123`,
   drops >90-day entries), write `history` + `status`.
4. `updateBadge(sample, badgeTarget)`.

### Two-tier collection (`collectProvider`, `background.js:114`)

`directCollector()` first (`collectClaudeDirect` / `collectCodexDirect`); on any throw, fall back to
`collectInBackgroundTab(provider)`. The result records `source: "direct" | "background-tab"` and any
`error`. See [[usage-collection]] and [[2026-07-15-direct-fetch-then-background-tab-fallback]].

- **Direct** (`background.js:13`): `fetch(url, { credentials:"include", cache:"no-store" })`.
- **Background tab** (`background.js:57`): open an **inactive** tab at `claude.ai/new` or
  `chatgpt.com/codex`, `waitForTab` until `status === "complete"` (20s timeout), then
  `chrome.scripting.executeScript({ world:"MAIN", … })` to run the same fetch **in the page**, and
  always remove the tab in a `finally`.

## Alarm scheduling (`scheduleAlarm` / `ensureAlarm`, `background.js:184`)

Interval is one of 5/10/15/30/60 min (`normalizeRefreshInterval`, default 15). `ensureAlarm` creates
the alarm if missing (first tick after 0.1 min) and re-creates it when the interval changed.

## Badge (`updateBadge`, `background.js:126`)

Paints `Math.round(used)` for the configured `badgeTarget`, `"!"` when that metric is missing, `""`
when target is `none`. Background color: red `#D05A42` at ≥80%, else provider color
(Claude `#BD654B`, Codex `#3F7766`). See [[toolbar-badge]].

## Permissions (`manifest.json`)

`alarms`, `storage`, `tabs`, `scripting`; host permissions `https://claude.ai/*`,
`https://chatgpt.com/*`. `tabs`+`scripting`+hosts exist specifically for the background-tab fallback.

## Related
[[dashboard]] · [[settings]] · [[claude-ai-usage-api]] · [[chatgpt-codex-usage-api]] ·
[[data-export-and-retention]]
