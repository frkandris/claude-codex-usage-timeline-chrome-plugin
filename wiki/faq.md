---
type: FAQ
title: FAQ
description: Non-obvious questions worth remembering about the AI Usage Timeline extension.
timestamp: 2026-07-21
---

# FAQ

**Why does the Fable card show "—" / "No reset"?**
Almost always because the running extension is on **old code** — Chrome caches extension code at load
time, so editing `lib/usage.js` on disk does nothing until you reload the extension at
`chrome://extensions`. The Fable value also only appears after a *fresh* collection populates it. See
[[fable-or-metric-shows-no-data]] and the postmortem [[2026-07-21-fable-no-data-limits-array]].

**Why is there no build step?**
Everything is native ES modules loaded directly by Chrome. No bundler/transpiler means edits are live
after an extension reload, and the only tooling is `node --test`. See [[architecture]].

**Why does collecting sometimes briefly open a tab?**
If the direct `fetch` from the service worker doesn't get the provider's session cookie, the extension
falls back to opening an **inactive** provider tab, reading the same JSON in-page, and closing it. See
[[2026-07-15-direct-fetch-then-background-tab-fallback]].

**Why is the Codex weekly row / Fable row sometimes missing?**
Both are **optional** metrics: the UI hides them until the latest sample has a finite value for them
(`hasCurrentMetric`, `dashboard/dashboard.js:100`; Codex weekly at `:341`, Fable legend at `:340`).

**Are prompts / conversations / API keys read?**
No. The extension only reads the two providers' internal *usage* endpoints. All data stays in
`chrome.storage.local` for ≤90 days. See `README.md` and [[data-export-and-retention]].

**Why do the same percentage values live under different field names (`utilization` vs `percent`)?**
The claude.ai response is mid-migration: the legacy top-level `five_hour`/`seven_day` objects use
`utilization`; the newer `limits[]` entries use `percent`. `metric()` reads both
(`lib/usage.js:26`). See [[claude-ai-usage-api]].

**Clicking a point on the chart deletes it — is that intended?**
Yes. A single point is a single measurement; clicking it (after a confirm) removes just that
provider+metric measurement from that sample via `removeMeasurement` (`lib/usage.js:130`). Useful for
pruning a bad reading. See [[measurement-deletion]].

**The two provider endpoints are undocumented — how do we keep up when they change?**
Capture the live JSON (signed in, from the provider tab's console) and update
[[claude-ai-usage-api]] / [[chatgpt-codex-usage-api]] with the shape + observation date. The parsers
are deliberately tolerant (many field-name fallbacks + a tree walker), and `parseClaudeUsage` /
`parseCodexUsage` throw a "format is not recognized" error when nothing matches so the UI can show
"Error" rather than silently zeroing.
