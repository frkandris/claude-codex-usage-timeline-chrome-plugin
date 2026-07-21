---
type: Feature
title: Timeline chart
description: The custom canvas chart that plots both providers' metrics over a selectable time range.
timestamp: 2026-07-21
---

# Timeline chart

A hand-drawn `<canvas>` line chart of every active metric over the selected range. No chart library —
one `drawChart` function (`dashboard/dashboard.js:133`). See [[2026-07-15-canvas-timeline-no-chart-library]].

## Rendering pipeline (`drawChart`)
1. Size the canvas to its box × `devicePixelRatio` (capped at 2); scale the context.
2. Filter `history` to the range (`filteredHistory`, `:127`); draw 0–100% gridlines + Y labels.
3. Compute the X mapping. The plot area extends **past "now"** to leave room for forecasts:
   `end = now + max(now - start, 1)` (`:163`). A single sample is centered (`:164`).
4. Draw a dashed **"now"** vertical line (`:181`).
5. For each active series: stroke the line, collect points + segments, and handle two edge cases —
   a **boundary bridge** from the last off-screen sample into view (`:210`), and dashed **gap
   bridges** across missing samples (`:238`). Single-sample series render as a ring (`:244`).
6. Draw point dots (only when ≤160 points, `:251`).
7. Draw [[trend-forecast]] projections (`:260`).
8. Cache geometry on `canvas._chart` for hit-testing by the hover/click handlers.

## Series & styling (`dashboard/dashboard.js:28`)
Provider color encodes meaning (Claude `#bd654b`, Codex `#3f7766`); dash pattern encodes the metric
(session solid, weekly `[10,7]`, Fable `[8,4,2,4]`). Session lines are drawn thicker than secondary
metrics. Active series = enabled provider **and** (non-optional **or** currently has data)
(`activeSeries`, `:35`).

## Range & empty state
Range select persists `selectedRange` (`:370`); "No data" empty state shows when no visible series has
a value (`:142`). Colors/paddings are module constants (`:27`, `:144`).

## Interactions
Hover priority forecast-marker → point → segment; click a point to delete it. See [[measurement-deletion]].

## Related
[[dashboard]] · [[trend-forecast]] · [[measurement-deletion]]
