---
type: Feature
title: Measurement deletion
description: Click a chart point to remove that single provider+metric measurement.
timestamp: 2026-07-21
---

# Measurement deletion

Clicking a data point on the [[timeline-chart]] deletes **just that one measurement** (a
provider+metric at one timestamp) — useful for pruning a bad reading without clearing all history.

## Flow
- Click handler (`dashboard/dashboard.js:435`) finds the nearest point within 10px, confirms
  ("Delete <label> measurement from <time>?"), then calls `removeMeasurement` and reloads.
- `removeMeasurement(history, timestamp, provider, metricName)` (`lib/usage.js:130`):
  - finds the matching sample, deletes `sample[provider][metricName]`;
  - if that provider now has no metrics, sets it to `null`;
  - **drops the whole sample** if neither `claude` nor `codex` has any finite `used` left
    (`:137`) — so deleting the last measurement removes the timestamp entirely.
- Covered by `test/usage.test.js:50-65`.

## Contrast with "Clear history"
[[settings]] → **Clear history** wipes the entire `history` array (with confirm). Deletion here is
surgical; Clear is total.

## Related
[[timeline-chart]] · [[data-export-and-retention]]
