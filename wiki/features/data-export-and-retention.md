---
type: Feature
title: Data export & retention
description: Where usage data lives, how long it's kept, and how to export or clear it.
timestamp: 2026-07-21
---

# Data export & retention

## Storage
All samples live in `chrome.storage.local` under `history` (plus `status`, settings keys). Nothing
leaves the browser; no server. See `README.md` ("How it works, and privacy") and [[architecture]].

## Retention — 90 days
`appendSample` (`lib/usage.js:123`) drops any sample older than `HISTORY_RETENTION_MS`
= `90 * 24 * 60 * 60 * 1000` (`lib/usage.js:1`) on every write, and keeps the array sorted by
timestamp. So history self-trims to a rolling 90-day window; there is no separate cleanup job.

## Export CSV ([[settings]], `settings/settings.js:118`)
Client-side Blob download `ai-usage-YYYY-MM-DD.csv`, columns:
`timestamp, claude_5h_percent, claude_weekly_percent, claude_fable_percent, codex_5h_percent,
codex_weekly_percent`. Missing metric → empty cell.

## Clear history ([[settings]], `settings/settings.js:137`)
Confirms, then sets `history` to `[]`. Total wipe (contrast with surgical [[measurement-deletion]]).

## Related
[[measurement-deletion]] · [[settings]] · [[glossary]]
