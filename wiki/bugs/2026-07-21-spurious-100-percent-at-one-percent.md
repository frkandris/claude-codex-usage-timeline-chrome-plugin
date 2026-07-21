---
type: Bug
title: Spurious 100% readings when a metric is actually 1%
description: percent()'s (0,1] fraction heuristic mapped an integer 1 (=1%) to 100%.
tags: [claude, codex, parsing, normalization]
timestamp: 2026-07-21
---

# Spurious 100% readings when a metric is actually 1% — postmortem

**Date:** 2026-07-21 · **Area:** `lib/usage.js` (`percent`) · **Status:** Resolved.

## Symptom
Occasional isolated samples stored **100%** for a metric — most often at night — while real usage was
near-zero. The user had been deleting these by hand (see [[measurement-deletion]]). Not caused by
sleep or the background-tab fallback.

## Root cause
`percent()` normalized utilization with a fraction-detection heuristic
(`lib/usage.js:11`, before the fix):
```js
const normalized = number > 0 && number <= 1 ? number * 100 : number;
```
It exists to accept a 0–1 fraction and rescale to 0–100. But the live provider APIs return **integer
percentages** (observed `18`, `27`, `2`, …). When a limit legitimately reads **1%**, the API sends the
integer `1`; the `<= 1` branch misread it as the fraction `1.0` and multiplied by 100 → **100%**.

Reproduction (pre-fix): `percent(1) → 100`, `percent(0.4) → 40`, `percent(2) → 2`, `percent(27) → 27`.

### Why "at night"
Nothing sleep-specific. Night is when usage is lowest, so it's when a window most plausibly sits at
exactly 1% — the one integer value that triggered the bug. The correlation with sleep is that the
missed alarm fires on wake, during that low-usage window.

## Fix
One character: `<= 1` → `< 1` (`lib/usage.js:11`). Now `1 → 1%`, while genuine sub-1 fractions
(e.g. `0.42 → 42%`) still rescale. Tests added: "reads an integer 1 as 1%, not a full fraction" and
"still rescales a genuine sub-1 fraction" (`test/usage.test.js`); 23 tests green.

**Chosen over** dropping the fraction heuristic entirely: the live capture shows integer percents from
claude.ai, but the Codex shape was not re-verified live, so keeping sub-1 rescaling is the
conservative choice. Residual ambiguity: a genuine `0.5` meaning 0.5% would still render 50% — not
observed in practice, revisit if it ever is.

## Lessons
- **`x ≤ 1` is a poor "is this a fraction?" test** when the same field also carries integer percents —
  `1` is ambiguous (1% vs 100%) and unresolvable from a single sample. Prefer scale info from the
  source over value-range guessing.
- The two provider endpoints returning **0–100 integers** is a load-bearing assumption; if a provider
  ever switches to 0–1 fractions, this normalization needs rethinking. See [[claude-ai-usage-api]].

## Related
[[claude-ai-usage-api]] · [[chatgpt-codex-usage-api]] · [[glossary]] (`used`) · [[measurement-deletion]]
