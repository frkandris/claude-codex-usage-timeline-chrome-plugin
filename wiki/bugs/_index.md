# bugs/

One postmortem per notable bug: `YYYY-MM-DD-<slug>.md`. Skeleton: Symptom / **Root cause** / Fix /
Lessons. Only record bugs whose root cause was surprising or whose class is likely to recur — skip
trivial fixes the diff explains.

## Resolved
* [[2026-07-31-codex-weekly-window-labelled-5h]] — `primary_window` was mapped to the 5-hour metric by
  position; on plans whose only window is weekly, the weekly limit was displayed as "5 hours".
* [[2026-07-21-spurious-100-percent-at-one-percent]] — an integer `1` (=1%) was rescaled to 100% by
  `percent()`'s fraction heuristic; caused the occasional night-time 100% spikes.
* [[2026-07-21-fable-no-data-limits-array]] — Fable card showed "—" after claude.ai moved the limit
  into `limits[]` with a new field name.

## Open
_(none)_
