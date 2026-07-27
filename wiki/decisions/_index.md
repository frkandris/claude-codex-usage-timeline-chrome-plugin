# decisions/

One page per architectural/design decision: `YYYY-MM-DD-<slug>.md`. Skeleton: Context / Options
considered / Decision / **Why** / Consequences. The *Why* is load-bearing — capture rationale that the
diff alone doesn't show; skip decisions whose why is obvious.

Decisions are durable records; they don't move to "resolved". Supersede by writing a new dated page and
linking back.

## Records
* [[2026-07-27-store-listing-positioning]] — trademarked store name, seeded screenshots, Pages-hosted policy.
* [[2026-07-21-limits-array-for-fable]] — read Fable from the tolerant `limits[]` walk, not a hard path.
* [[2026-07-15-direct-fetch-then-background-tab-fallback]] — worker fetch first, in-page tab fallback.
* [[2026-07-15-canvas-timeline-no-chart-library]] — hand-drawn canvas, no charting dependency.
