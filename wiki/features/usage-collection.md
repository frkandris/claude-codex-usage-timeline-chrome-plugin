---
type: Feature
title: Usage collection
description: How the extension samples both providers' usage limits on a schedule and on demand.
timestamp: 2026-07-21
---

# Usage collection

Periodically (and on demand) sample each enabled provider's usage limits into one `history` sample.

## Entry points
- Scheduled: `chrome.alarms` `collect-usage` → `collectUsage()` (`background.js:150,215`).
- On demand: dashboard refresh button → `collect-now` message → `collectUsage()`
  (`dashboard/dashboard.js:365`, `background.js:218`).

## Two-tier strategy (`collectProvider`, `background.js:114`)

1. **Direct** — `fetch(..., { credentials:"include", cache:"no-store" })` from the worker
   (`collectClaudeDirect` `:19`, `collectCodexDirect` `:31`).
2. **Background-tab fallback** — on any throw, open an **inactive** provider tab and run the identical
   fetch in the page's `MAIN` world via `chrome.scripting.executeScript`, then close the tab
   (`collectInBackgroundTab`, `:57`). Needed when the direct request lacks the session cookie/token.
   See [[2026-07-15-direct-fetch-then-background-tab-fallback]].

Each provider yields `{ data, error, source }`; `source` is `"direct"` or `"background-tab"`.

## Per-provider specifics
- **Claude**: org-id discovery then `/usage`; cookie auth. See [[claude-ai-usage-api]].
- **Codex**: session token + `ChatGPT-Account-Id` header then `/wham/usage`. See
  [[chatgpt-codex-usage-api]].

## Output
One sample `{ timestamp, claude, codex }` appended via `appendSample` (`lib/usage.js:123`); `status`
records `{ enabled, ok, error, source }` per provider (drives the dashboard pill). A failed provider is
stored as `null` for that sample so gaps are visible on the [[timeline-chart]].

## Related
[[background-service-worker]] · [[timeline-chart]] · [[data-export-and-retention]]
