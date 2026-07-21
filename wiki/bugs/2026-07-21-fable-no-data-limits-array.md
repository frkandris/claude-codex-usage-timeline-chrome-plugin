---
type: Bug
title: Fable card shows "—" / "No data" despite real usage
description: The Fable weekly limit moved into limits[] and used a new field name, so parseClaudeUsage missed it.
tags: [claude, parsing, fable]
timestamp: 2026-07-21
---

# Fable shows "—" / "No reset" despite real usage — postmortem

**Date:** 2026-07-21 · **Area:** `lib/usage.js` (`parseClaudeUsage`) · **Status:** Resolved.

## Symptom
The dashboard Claude **Fable** card showed `—` and "No reset", while claude.ai → Settings → Usage
showed Fable at 2% used with a Friday reset. Session (17–18%) and Week (27%) were correct.

## Root cause
The claude.ai `/usage` response changed where Fable lives. Fable was no longer a top-level
`seven_day_fable` key (all `seven_day_*` codename keys are now `null`). It moved into the `limits[]`
array as:
```json
{ "kind": "weekly_scoped", "percent": 2, "resets_at": "…",
  "scope": { "model": { "id": null, "display_name": "Fable" } } }
```
`parseClaudeUsage` missed it for **two** independent reasons:
1. **Field name.** The new entry carries its percentage in `percent`; `metric()` only read
   `utilization` / `used_percent` / `usedPercent` / `percentage`.
2. **Identity.** `findNamedMetric` built its match string from `child.model`, but the model name is
   nested at `child.scope.model.display_name` — so "Fable" never appeared and the tree-walker skipped
   the entry. (The legacy `data.seven_day_fable` fallback was `null`.)

Session/Week were unaffected because they still read the top-level `five_hour`/`seven_day` objects,
which retain `utilization`.

## Why it wasn't obvious
The percentages *did* keep updating (Session/Week), which looked like "collection works, Fable just
has no data" — masking a shape change. The truth only showed by capturing the **live** `/usage` JSON
(signed in, from the page console) and inspecting `limits[]`.

## Fix
Two one-line changes in `lib/usage.js`:
- `metric()` reads `… ?? window.percent` as an additional percentage field.
- `findNamedMetric` identity includes `child.scope?.model?.display_name` and `child.scope?.model?.id`.

Verified by a new test using the real `limits[]` shape (`test/usage.test.js`, "finds the Fable limit
inside the scoped limits array") — 21 tests green — **and** by running the live captured response
through the parser (→ `fable.used: 2`, valid `resetsAt`). Then reloaded the extension; the card showed
`2%` + "Resets …".

## Lessons
- **Reload the extension to test parser fixes** — Chrome caches code; disk edits don't apply until
  reload. See [[loading-and-reloading-the-extension]].
- **Verify parser changes against a live response**, not just a hand-written fixture — the fixture is
  only as right as your assumption about the shape.
- **A partially-working provider ("some metrics fine, one missing") often means a shape change**, not
  missing data. See runbook [[fable-or-metric-shows-no-data]].

## Related
[[2026-07-21-limits-array-for-fable]] (the decision) · [[claude-ai-usage-api]] · [[glossary]] (Fable)
