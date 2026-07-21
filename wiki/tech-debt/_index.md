# tech-debt/

One page per longer-lived, accepted owed-work item. Format: what/why it's owed, the cost of leaving
it, and what paying it down looks like. Move items from **Open** to **Paid down** rather than deleting.

## Open
* **Fable is exported to CSV but has no badge-target option.** `settings/settings.js:120` exports a
  `claude_fable_percent` column, but the badge dropdown (`lib/settings.js:4`, `settings/index.html:46`)
  offers only session/weekly per provider. Low priority; add `claude-fable` to `BADGE_TARGETS` +
  option if wanted. Source: read of both files, 2026-07-21.

## Paid down
_(none)_
