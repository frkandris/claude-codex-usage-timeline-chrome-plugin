---
type: Architecture
title: Architecture
description: Layers, data flow, and one worked end-to-end example for the AI Usage Timeline extension.
timestamp: 2026-07-21
---

# Architecture

AI Usage Timeline is a **Chrome Manifest V3** extension, ~1400 LOC of **vanilla ES modules** — no
framework, no bundler, no TypeScript, no build step. Files are loaded directly by Chrome (`manifest.json`
declares the service worker as `"type": "module"`; HTML pages use `<script type="module">`). Tests run
on `node --test`. See [[development-and-testing]].

## Layers

The dependency direction is strictly one-way: **`lib/` ← `background.js` / UI**. `lib/` is pure and
has no Chrome API dependency, which is exactly why it is the only unit-tested layer.

1. **`lib/` — pure logic (tested ground truth).**
   - `lib/usage.js` — parsing the two providers' responses (`parseClaudeUsage`, `parseCodexUsage`),
     org-id discovery (`findOrganizationId`), JWT account-id extraction (`extractChatGptAccountId`),
     history math (`appendSample`, `removeMeasurement`), and the forecast (`projectUsage`).
   - `lib/settings.js` — settings normalization + allowed values (intervals, badge targets).
   - No `chrome.*`, no DOM. Deterministic. Covered by `test/usage.test.js`, `test/settings.test.js`.
2. **`background.js` — the service worker (orchestration + side effects).**
   Owns the collection cycle, the `chrome.alarms` schedule, `chrome.storage.local`, the toolbar badge,
   and message handling. This is the only layer that performs network I/O and touches Chrome APIs at
   collection time. See [[background-service-worker]].
3. **UI — `dashboard/` and `settings/` (presentation).**
   Read from `chrome.storage.local`, re-render on `storage.onChanged`, and send messages
   (`collect-now`, `update-settings`) to the worker. `dashboard/` renders the chart on a raw
   `<canvas>`. See [[dashboard]], [[settings]].

## Data model

One append-only array `history` in `chrome.storage.local`. Each element is a **sample**:

```js
{
  timestamp: 1753050000000,                 // Date.now() at collection
  claude: { session: {used, resetsAt}, weekly: {used, resetsAt}, fable: {used, resetsAt} } | null,
  codex:  { session: {used, resetsAt}, weekly: {used, resetsAt} } | null
}
```

`used` is a 0–100 percentage (or `null` when that metric wasn't available); `resetsAt` is an epoch-ms
timestamp (or `null`). A provider is `null` for that sample when collection failed. Samples older than
90 days are dropped (`HISTORY_RETENTION_MS`, `lib/usage.js:1`). See [[data-export-and-retention]].

## Collection cycle (the heartbeat)

`chrome.alarms` fires `collect-usage` every N minutes (`background.js:215`) → `collectUsage()`
(`background.js:150`) collects each enabled provider **in parallel**, appends one sample, writes
`history` + `status`, and updates the badge. The same path runs on demand via the `collect-now`
message from the dashboard refresh button.

Each provider is collected with a **two-tier strategy** (`collectProvider`, `background.js:114`):
direct `fetch` first, and if that throws, a fallback that opens an inactive provider tab and runs the
same fetch in-page. See [[2026-07-15-direct-fetch-then-background-tab-fallback]] and [[usage-collection]].

## Worked end-to-end example — Claude's "Fable" metric, API → pixel

This traces one metric through every layer. It is the template new features follow.

1. **Alarm → collect.** `collect-usage` fires → `collectUsage()` calls
   `collectProvider("claude", collectClaudeDirect)` (`background.js:157`).
2. **Discover the org.** `collectClaudeDirect` (`background.js:19`) fetches
   `https://claude.ai/api/organizations` (falling back to `/api/bootstrap`), then walks the JSON for an
   organization id via `findOrganizationId` (`lib/usage.js:107`).
3. **Fetch usage.** It fetches `https://claude.ai/api/organizations/<org>/usage` and passes the JSON to
   `parseClaudeUsage` (`lib/usage.js:52`). See [[claude-ai-usage-api]] for the exact response shape.
4. **Parse Fable.** Fable is **not** a top-level key — it lives in the `limits[]` array as a
   `weekly_scoped` entry: `{ percent: 2, resets_at, scope: { model: { display_name: "Fable" } } }`.
   `findNamedMetric` (`lib/usage.js:34`) walks the tree, matches "Fable" via
   `scope.model.display_name`, and `metric()` reads the `percent` field →
   `fable: { used: 2, resetsAt: … }`. This mapping is the subject of
   [[2026-07-21-limits-array-for-fable]] / [[2026-07-21-fable-no-data-limits-array]].
5. **Append + store.** `collectUsage` builds the sample and calls `appendSample` (`lib/usage.js:123`),
   which appends, drops >90-day-old entries, and sorts; the result is written to `history`.
6. **UI reacts.** `dashboard.js` `storage.onChanged` (`dashboard/dashboard.js:456`) → `load()` →
   `render()`. `renderProvider("claude")` (`dashboard/dashboard.js:104`) writes the "Fable" card
   (`#claudeFable` value + bar + reset label). The Fable card/line are **optional** — shown only when
   the latest sample has a finite `fable.used` (`hasCurrentMetric`, `dashboard/dashboard.js:100`).
7. **Chart.** `drawChart` (`dashboard/dashboard.js:133`) plots the Fable series with its dashed stroke
   (`series[2]`, `dashboard/dashboard.js:31`), plus a [[trend-forecast]] projection if enabled.

## Provenance
All `file:line` references are against the initial commit. The provider response shapes in
[[claude-ai-usage-api]] and [[chatgpt-codex-usage-api]] were captured live on 2026-07-20/21.
