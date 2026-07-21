# AI Usage Timeline

Chrome Manifest V3 extension that samples Claude and Codex usage-limit utilization every 5–60 minutes
and renders it on a shared canvas timeline with trend forecasts. Vanilla ES modules, no build step;
tests run on `node --test` (`npm test`).

## Project knowledge base — `wiki/`

`wiki/` is an LLM-maintained knowledge base for this project. It captures everything the code alone
doesn't show: architectural patterns, decisions and their rationale, bug postmortems, known hacks and
tech debt, the two undocumented provider-API contracts, runbooks, and the domain glossary.

**On every non-trivial task in this project, before starting work:**

- Read `wiki/CLAUDE.md` — the schema. It defines when to update the wiki and how to write pages. Treat
  the schema's "When to update" list as a checklist for the current task.
- Skim `wiki/index.md` — the map of content. Find the pages relevant to the area you're touching and
  read them. The wiki is the fastest way to absorb context prior sessions spent hours learning.
  (Editing parsing? Start with `wiki/integrations/` — the provider APIs are undocumented and mutate.)

**While working:**

- If a decision is made, a non-obvious bug is fixed, a hack is added, an integration changes, a domain
  term comes up, or an incident is handled — create or update the relevant wiki page per the schema,
  and append a one-line entry to `wiki/_log.md`. **Wiki updates land in the same commit (or PR) as the
  code change that triggered them**, so `git log` ties them together.
- There is no formatter/linter/bundler in this project, so nothing rewrites the wiki Markdown.

**For new feature work:**

`wiki/architecture.md` contains a worked end-to-end example (Claude's Fable metric, API → pixel)
showing the layered pattern every new feature follows. Use it as the template.

## Quick facts

- **Layers:** `lib/` (pure, tested) ← `background.js` (MV3 worker: collection, alarm, storage, badge)
  ← `dashboard/` + `settings/` (UI). Only `lib/` is unit-tested.
- **Providers:** `claude.ai` (cookie auth, org discovery + `/usage`) and `chatgpt.com` (session token
  + `/wham/usage`). Both endpoints are undocumented — see `wiki/integrations/`.
- **Reload matters:** Chrome caches extension code; after editing, reload at `chrome://extensions`
  before testing. See `wiki/workflows/loading-and-reloading-the-extension.md`.
- **Tests:** `npm test`.
- **Remote:** GitHub `frkandris/claude-codex-usage-timeline-chrome-plugin` (`gh` available).
