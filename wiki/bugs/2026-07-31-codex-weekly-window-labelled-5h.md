---
type: Bug
title: Codex weekly limit was displayed as the 5-hour window
description: parseCodexUsage mapped primary_window to "session" by position; on plans with no 5-hour window that position holds the weekly limit.
tags: [codex, chatgpt, parsing, window-classification]
timestamp: 2026-07-31
---

# Codex weekly limit shown as "5 hours" — postmortem

**Date:** 2026-07-31 · **Area:** `lib/usage.js` (`parseCodexUsage`) · **Status:** Resolved.

## Symptom
The Codex overview card showed **5 hours — 2%, "Resets 5 Aug, 15:25"**: a reset five days out under a
label meaning five hours. chatgpt.com → Settings → Analytics showed a single **weekly** limit ("98%
remaining", resets 2026-08-05 15:25) and no 5-hour limit at all. The chart's "Codex · 5h" series was
therefore plotting weekly data, and the "Codex · week" row/series stayed hidden.

## Root cause
`parseCodexUsage` classified windows by **position**, not by length: `primary_window` → `session`,
`secondary_window` → `weekly`. That mapping assumed every account has a 5-hour window in the primary
slot. Live response on a **team** plan (captured 2026-07-31 from the page console):

```json
"rate_limit": {
  "allowed": true, "limit_reached": false,
  "primary_window": { "used_percent": 2, "limit_window_seconds": 604800,
                      "reset_after_seconds": 431811, "reset_at": 1785936346 },
  "secondary_window": null
}
```

`limit_window_seconds: 604800` is 7 days — the only window this account has is the weekly one, and it
sits in the primary slot. Nothing in the parser read `limit_window_seconds`, so the reading was
silently mislabelled rather than dropped.

## Why it wasn't obvious
The number itself was correct (2% = 2%), and a plausible-looking value in a labelled row does not
announce itself as misfiled. Only the **reset timestamp** contradicted the label — a five-day reset
under a five-hour heading — which is why the two screenshots side by side surfaced it.

## Fix
- `parseCodexUsage` (`lib/usage.js`) now reads the declared window length
  (`limit_window_seconds` / `limitWindowSeconds` / `window_seconds` / `windowSeconds`, plus the
  `*_minutes` variants) and assigns: `<= 24 h` → `session`, `> 24 h` → `weekly`. When no length is
  declared, the old position-based mapping still applies, so payloads that never carried the field
  keep parsing as before.
- `migrateCodexWindows` (`lib/usage.js`, run from `migrateStoredHistory()` at service-worker startup)
  relabels already-stored samples. Without it the chart would show a broken 5h series next to a new
  weekly one for the same data. Classification works off **reset timestamps, not per-sample
  remaining time**, because a sample taken in the last hours of a weekly window looks short-dated on
  its own: every reset more than 24 h after any sample — plus every reset already stored as weekly —
  marks that timestamp as a weekly window, and all samples sharing it move together. A sample whose
  *both* metrics contradict their labels (long-dated `session`, short-dated `weekly`, from a payload
  that put the weekly window first) is swapped rather than dropped.
- The toolbar badge is retargeted whenever it points at a metric the plan does not expose
  (`resolveBadgeTarget`, `background.js`) — on every collection, and immediately after a migration,
  so an offline account never keeps a `!` badge. Settings keeps the chosen *provider* when it has to
  change the metric.
- The Codex **5-hour row and legend are now optional** the same way the weekly ones are
  (`dashboard/dashboard.js`, `dashboard/index.html`), and the `codex-session` badge target hides when
  the plan has no 5-hour window (`settings/settings.js`). The 5-hour row stays as the placeholder when
  *neither* metric has data, so a card with no data still renders as before.

Tests: 23 → 27 (`test/usage.test.js`), including the live payload above.

## Lessons
- **A window's meaning comes from its declared length, not its slot in the payload.** Position-based
  mappings of provider payloads are assumptions about a plan tier, not facts about the API.
- **Cross-check the reset timestamp against the label.** A reset horizon that doesn't match the
  window name is the cheapest available signal that a metric is misfiled.
- **Relabelling a metric is a data migration.** Stored history carries the old classification; fixing
  the parser alone leaves the chart telling two different stories about the same series.

## Related
[[chatgpt-codex-usage-api]] · [[glossary]] (5-hour window, weekly) · [[usage-collection]] ·
[[2026-07-21-fable-no-data-limits-array]] (the same class of failure on the claude.ai side)
