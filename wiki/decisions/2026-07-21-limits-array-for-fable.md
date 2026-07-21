---
type: Decision
title: Read Fable from the scoped limits[] array
description: Extend the tolerant parser to find Fable in limits[] rather than adding a brittle top-level key.
tags: [claude, parsing, fable]
timestamp: 2026-07-21
---

# Decision: read Fable from the scoped `limits[]` array

**Date:** 2026-07-21 · **Status:** Adopted.

## Context
claude.ai moved the Fable weekly limit out of a top-level `seven_day_fable` key into `limits[]` as a
`weekly_scoped` entry (`percent` + `scope.model.display_name == "Fable"`), breaking Fable parsing. See
the postmortem [[2026-07-21-fable-no-data-limits-array]].

## Options considered
1. **Add a hard-coded path** to `limits[]` for the Fable/weekly_scoped entry.
2. **Extend the existing tolerant primitives** — teach `metric()` the `percent` field and
   `findNamedMetric` the `scope.model` identity — so the generic tree-walker finds it. *(chosen)*
3. Re-model the whole parser around `limits[]` as the primary source.

## Decision
Option 2. Two minimal edits in `lib/usage.js`:
- `metric()` also reads `window.percent`.
- `findNamedMetric` identity also includes `scope.model.display_name` / `scope.model.id`.

## Why
- The codebase's parsing philosophy is **many tolerant fallbacks + a tree walker**, precisely because
  these endpoints are undocumented and mutate. Extending the primitives keeps that resilience and
  fixes the class of problem (any future scoped model limit), not just Fable.
- It is a 2-line change with no behavior change for Session/Week (they still read top-level
  `utilization`), verified by the full test suite + a live-response check.
- Option 1 is brittle (breaks on the next rename); Option 3 is a large rewrite unjustified while
  `five_hour`/`seven_day` still populate Session/Week.

## Consequences
- Fable now resolves from `limits[]`; the `seven_day_fable` fallback remains as a belt-and-suspenders
  path.
- The tree walker now also matches on nested `scope.model`, which is the documented shape in
  [[claude-ai-usage-api]]. If Claude later drops the top-level `five_hour`/`seven_day` too, revisit
  Option 3 (make `limits[]` primary).

## Related
[[2026-07-21-fable-no-data-limits-array]] · [[claude-ai-usage-api]] · [[architecture]]
