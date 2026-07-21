# Wiki changelog

Append-only, newest first. One self-contained line per entry.

## 2026-07-21
* Bootstrapped the wiki (Karpathy LLM-Wiki pattern, OKF-style frontmatter). Scaffolded taxonomy; wrote schema (`CLAUDE.md`), `architecture`, `glossary`, `faq`; `apps/` (background, dashboard, settings), `features/` (6 pages), `integrations/` (claude.ai + chatgpt.com, from live API responses captured this session), `workflows/`, `runbooks/`, and the first `decisions/`/`bugs/` pages. Source: full read of `background.js`, `lib/*.js`, `dashboard/*`, `settings/*`, `manifest.json`, `README.md`, `PRODUCT.md`, `test/*` at initial commit.
* Recorded [[2026-07-21-fable-no-data-limits-array]] (bug) and [[2026-07-21-limits-array-for-fable]] (decision): the claude.ai `/usage` endpoint moved the Fable weekly limit into a `limits[]` array as a `weekly_scoped` entry using `percent` + `scope.model.display_name`; `parseClaudeUsage` was extended to read it. Source: this session's live captures + `lib/usage.js` edit.
* Noted that the July 16 session transcript for this project is off-topic (an unrelated video summary) and contains no extension knowledge — not a source.
