---
type: App
title: Dashboard
description: The canvas timeline UI — overview cards, chart, hover tooltips, and click-to-delete.
resource: dashboard/index.html
timestamp: 2026-07-21
---

# Dashboard — `dashboard/`

The primary UI, opened by clicking the toolbar icon. `dashboard/index.html` +
`dashboard/dashboard.js` (459 lines) + `dashboard/styles.css`. Pure reader of
`chrome.storage.local`; it never fetches provider data itself — it sends `collect-now` to the
[[background-service-worker]] and re-renders on `storage.onChanged` (`dashboard/dashboard.js:456`).

## Structure

- **Overview cards** — one per provider, each with `session` / `weekly` (+ Claude `fable`, + Codex
  `weekly` optional) as value + progress bar + reset label, and a status pill.
  `renderProvider` (`dashboard/dashboard.js:104`).
- **Timeline chart** — a raw `<canvas>` drawn by `drawChart` (`dashboard/dashboard.js:133`). No chart
  library. See [[timeline-chart]].
- **Range select** — 30 min … 30 days … All (`dashboard/index.html:51`); persisted as `selectedRange`.
- **Legend** — series toggle visibility follows provider enablement and optional-metric availability.

## Series (`dashboard/dashboard.js:28`)

`claude:session`, `claude:weekly`, `claude:fable` (optional), `codex:session`, `codex:weekly`
(optional). Each has a dash pattern. Optional series appear only when `hasCurrentMetric` is true
(`dashboard/dashboard.js:35,100`).

## Interactions

- **Hover** (`:375`) — nearest of: forecast marker (≤14px) → data point (≤10px) → line segment (≤8px);
  shows a tooltip and focuses/dims series.
- **Click a point** (`:435`) — confirm, then delete just that measurement via `removeMeasurement`.
  See [[measurement-deletion]].
- **Refresh button** (`:365`) — sends `collect-now`, disables itself while busy.

## Status pill (`renderProvider`, `:115`)

`ok` → hidden; auth-shaped error (401/403/"sign in"/…) → "Sign in" link to the provider; other error →
"Error" (title = message); otherwise "No data". This is where a broken provider surfaces to the user.

## Preview mode

Outside the extension (no `chrome.storage.local`), `extensionApi` swaps to a `previewApi` backed by
synthetic `previewData()` (`:37`) so `dashboard/index.html` renders standalone for design work.

## Related
[[timeline-chart]] · [[trend-forecast]] · [[settings]] · [[background-service-worker]]
