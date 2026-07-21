---
type: Feature
title: Trend forecast
description: The linear-regression projection that estimates when a metric hits 100% or its next reset.
timestamp: 2026-07-21
---

# Trend forecast

An optional dashed projection of each metric's recent trend, ending at a marker: either **100%**
("limit" reason) or the **next reset** ("reset" reason), whichever comes first. Toggle:
`showProjection` in [[settings]]. Computed by `projectUsage` (`lib/usage.js:144`), drawn in
`drawChart` (`dashboard/dashboard.js:260`).

## Algorithm (`projectUsage`, `lib/usage.js:144`)
1. Collect `{timestamp, value, resetsAt}` for the metric where `value` is finite. Need **≥3** points
   or return `null` (`:152`).
2. **Segment detection**: scan for a drop of `>8` percentage points between consecutive points — that
   marks a reset. Keep only the current segment (from the last such drop), then its **last ≤8 points**
   (`:154`). This avoids fitting a line across a reset cliff. Need ≥3 in that window.
3. **Least-squares slope** over `(timestamp, value)` normalized to the segment origin (`:161`). Zero
   variance → `null`.
4. If the last value is already ≥100 → `null` (`:169`).
5. `exhaustsAt` = when the line reaches 100 (if slope > 0, else ∞); `resetAt` = the last known reset if
   it's in the future. **Target = min(exhaustsAt, resetAt)** (`:171`). Must be strictly in the future,
   else `null`.
6. Return `{ last, slope, targetTimestamp, targetValue, targetReason }`, where `targetReason` is
   `"limit"` if exhaustion comes first, else `"reset"`.

## Drawing (`dashboard/dashboard.js:260`)
A bridge segment from the last real point to "now", then the projection line to the target (dash
pattern per metric), and a ring marker at the target (larger for `"limit"`). Hovering the marker shows
either "Estimated limit reach: <time>" or "Resets: <time> / Estimated: <pct>" (`:393`).

## Notes
- The forecast is intentionally conservative: it fits only the current segment's tail, so a fresh
  reset or a flat series produces a short, honest line (the tests cover increasing, flat, and
  reset-capped cases — `test/usage.test.js:67-116`).
- Projection color `#7b8ea1` is distinct from provider colors; it is a separate legend entry
  (`projectionLegend`).

## Related
[[timeline-chart]] · [[glossary]] (Segment, Projection)
