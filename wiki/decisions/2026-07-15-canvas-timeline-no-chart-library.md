---
type: Decision
title: Hand-drawn canvas timeline, no chart library
description: Why the timeline is a raw <canvas> rather than a charting dependency.
tags: [ui, chart, dependencies]
timestamp: 2026-07-21
---

# Decision: hand-drawn `<canvas>` timeline, no chart library

**Date recorded:** 2026-07-21 (documenting existing behavior; UI present since 2026-07-15).
**Status:** Adopted.

> Provenance: inferred from `PRODUCT.md` (design principles / anti-references) and the codebase's
> no-build, zero-dependency setup (`package.json`, `manifest.json`). No design-note transcript exists.
> Treat the "why" as reconstructed from those sources, not a recorded decision note.

## Context
The dashboard needs a multi-series time chart with custom behaviors: forecast projections, gap/boundary
bridges, hover hit-testing across points/segments/markers, and click-to-delete. `PRODUCT.md` calls for
a calm, precise, non-decorative UI where "provider colors carry data meaning, not decoration" and lists
generic SaaS card-grids and heavy decoration as anti-references.

## Options considered
1. A charting library (Chart.js / uPlot / D3).
2. **A single hand-drawn `<canvas>` renderer** (`drawChart`, `dashboard/dashboard.js:133`).

## Decision
Option 2 — one `drawChart` function over a raw canvas, with geometry cached on `canvas._chart` for
hit-testing.

## Why
- **No bundler exists** (vanilla ES modules loaded directly by Chrome); adding a library would mean
  vendoring it or introducing a build step, which the project deliberately avoids. See [[architecture]].
- The chart's **bespoke needs** (forecast bridges, gap handling, per-metric dash semantics, custom
  hover priority, click-to-delete) are as much custom code with a library as without — the library
  would mostly be overhead.
- Full control over the exact restrained visual language `PRODUCT.md` asks for.

## Consequences
- All chart behavior is in `drawChart` + the pointer handlers (`dashboard/dashboard.js:133–454`) — one
  place to maintain, but it is dense. Split it if it grows past the schema's ~200-line guidance.
- No third-party chart dependency to track or update.

## Related
[[timeline-chart]] · [[trend-forecast]] · [[architecture]]
