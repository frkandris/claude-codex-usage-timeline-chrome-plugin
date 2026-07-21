---
type: Glossary
title: Glossary
description: Domain vocabulary for the AI Usage Timeline extension.
timestamp: 2026-07-21
---

# Glossary

Terms as they are used in this codebase. Code references are against the initial commit.

- **Sample.** One collection result: `{ timestamp, claude, codex }`. The unit stored in `history`.
  See [[architecture]].
- **`history`.** The append-only array of samples in `chrome.storage.local`, trimmed to
  `HISTORY_RETENTION_MS` = 90 days (`lib/usage.js:1`). See [[data-export-and-retention]].
- **`used`.** A metric's utilization as a **0–100 percentage**. Normalized by `percent()`
  (`lib/usage.js:8`): a value in `(0,1]` is treated as a fraction and ×100; everything is clamped to
  0–100. `null` means "not available for this sample".
- **`resetsAt`.** Epoch-ms timestamp when a limit window resets, or `null`. Parsed by `resetTime()`
  (`lib/usage.js:15`) from `resets_at` / `reset_at` / `resetAt` (absolute) or `reset_after_seconds`
  (relative). Shown as "Resets <date>" or "No reset".
- **Session / 5-hour window.** Claude's `five_hour` limit; Codex's `primary_window`. The short rolling
  quota. Metric key: `session`.
- **Weekly / 7-day window.** Claude's `seven_day` (all models); Codex's `secondary_window`. Metric key:
  `weekly`. On the Codex card the weekly row is hidden until a finite value exists
  (`dashboard/dashboard.js:341`).
- **Fable.** A Claude model whose usage counts against a **separate weekly, model-scoped limit** on
  the Max plan. In the `claude.ai` API it appears inside `limits[]` as a `weekly_scoped` entry with
  `scope.model.display_name == "Fable"` (not as a top-level key). Metric key: `fable`; Claude-only,
  optional. See [[claude-ai-usage-api]], [[2026-07-21-limits-array-for-fable]].
- **Utilization vs `percent`.** The claude.ai response carries the same number under different field
  names depending on shape: `utilization` on the top-level `five_hour`/`seven_day` objects, and
  `percent` on entries inside `limits[]`. `metric()` reads both (`lib/usage.js:26`).
- **`limits[]`.** The newer, structured array in the claude.ai usage response. Each entry has
  `kind` (`session` / `weekly_all` / `weekly_scoped`), `group`, `percent`, `resets_at`, and optional
  `scope.model`. The scoped Fable limit lives here. See [[claude-ai-usage-api]].
- **Projection / Forecast.** A short linear-regression extrapolation of a metric's recent trend to
  either 100% ("limit") or the next reset ("reset"), drawn as a dashed line + marker. Computed by
  `projectUsage` (`lib/usage.js:144`). See [[trend-forecast]].
- **Segment (in the forecast).** A run of samples since the last large drop (>8 points). A reset
  resets the metric, so the forecast only fits the current segment's last ≤8 points
  (`lib/usage.js:154`).
- **Badge / badge target.** The number Chrome paints on the toolbar icon: one of
  `claude-session` / `claude-weekly` / `codex-session` / `codex-weekly` / `none`
  (`lib/settings.js:4`). Turns red at ≥80% (`background.js:135`). See [[toolbar-badge]].
- **Direct collection vs background-tab fallback.** Direct = a `fetch` from the service worker with
  `credentials:"include"`. Fallback = open an inactive provider tab and run the same fetch in the
  page's `MAIN` world. See [[2026-07-15-direct-fetch-then-background-tab-fallback]].
- **`status`.** Per-collection metadata written next to `history`: `{ lastAttempt, claude, codex }`,
  each provider `{ enabled, ok, error, source }`. Drives the "Sign in" / "Error" / "No data" pill
  (`dashboard/dashboard.js:115`).
- **Preview mode.** When the dashboard runs outside the extension (no `chrome.storage.local`), it uses
  synthetic `previewData()` (`dashboard/dashboard.js:37`) so the page renders standalone.
