---
type: Feature
title: Toolbar badge
description: The number painted on the extension icon and how its target and color are chosen.
timestamp: 2026-09-05
---

# Toolbar badge

The extension icon shows the current utilization of one chosen metric so you can glance at it without
opening the dashboard.

## Target selection
`badgeTarget` ∈ `claude-session` / `claude-weekly` / `codex-session` / `codex-weekly` / `none`
(`lib/settings.js:4`), chosen in [[settings]]. A legacy `badgeProvider` value is migrated to
`<provider>-session` by `normalizeProviderSettings` (`lib/settings.js:55`). If the selected target's
provider is disabled, it falls back to a valid one (or `none`) — Claude first, then Codex.

Two corrections run without the person touching anything:

- **First run** — on a brand-new install the badge follows whichever provider the first collection
  could actually read, in that same Claude → Codex order
  ([[2026-09-05-first-run-provider-detection]]).
- **Every collection** — `resolveBadgeTarget` (`background.js`) moves a target whose metric the plan
  does not expose to the other window of the same provider, so a weekly-only Codex account never
  shows a permanent `!` ([[2026-07-31-codex-weekly-window-labelled-5h]]).

## Painting (`updateBadge`, `background.js:126`)
- `none` → clear the text.
- Split target into `provider`/`metric`, read `sample[provider][metric].used`.
- Text = `Math.round(used)`, or `"!"` when the value is missing (collection failed / metric absent).
- Background color: **red `#D05A42` at ≥80%**, else provider color (Claude `#BD654B`, Codex
  `#3F7766`).

Updated after every collection (`collectUsage`, `background.js:180`) and on settings change
(`updateBadgeFromHistory`, `background.js:141`; also mirrored in `settings/settings.js:55`).

## Related
[[settings]] · [[background-service-worker]]
