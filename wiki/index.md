# AI Usage Timeline — wiki

LLM-maintained knowledge base for the **AI Usage Timeline** Chrome extension: a Manifest V3
extension that samples Claude and Codex usage-limit utilization every 5–60 minutes and renders it on
a shared time-series chart with trend forecasts.

New here? Read [[architecture]] first, then the schema in `CLAUDE.md` (how this wiki is maintained).

## Map of content

### Orientation
- [[architecture]] — layers, data flow, one worked end-to-end example.
- [[glossary]] — domain vocabulary (5-hour window, weekly, Fable, utilization, projection…).
- [[faq]] — questions worth remembering.

### Runtime surfaces — `apps/`
- [[background-service-worker]] — collection, alarm scheduling, storage, badge.
- [[dashboard]] — the chart, overview cards, hover/delete interactions.
- [[settings]] — interval, provider toggles, badge target, export/clear.

### Features — `features/`
- [[usage-collection]] · [[timeline-chart]] · [[trend-forecast]] · [[toolbar-badge]] ·
  [[measurement-deletion]] · [[data-export-and-retention]]

### External systems — `integrations/`  ← highest-value pages
- [[claude-ai-usage-api]] — undocumented `claude.ai` usage endpoint, org discovery, `limits[]` shape.
- [[chatgpt-codex-usage-api]] — undocumented `chatgpt.com` usage endpoint, JWT account-id, headers.

### Getting things done — `workflows/` · `runbooks/`
- [[development-and-testing]] · [[loading-and-reloading-the-extension]] · [[publishing-to-the-chrome-web-store]]
- [[fable-or-metric-shows-no-data]] · [[provider-shows-sign-in-or-error]]

### Reasoning trail — `decisions/` · `bugs/` · `tech-debt/` · `hacks/`
- Decisions: [[2026-07-27-store-listing-positioning]] · [[2026-07-21-limits-array-for-fable]] · [[2026-07-15-direct-fetch-then-background-tab-fallback]]
- Bugs: [[2026-07-21-fable-no-data-limits-array]]
- See each folder's `_index.md` for the full Active/Resolved split.

## Changelog
See `_log.md`.
