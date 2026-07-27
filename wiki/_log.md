# Wiki changelog

Append-only, newest first. One self-contained line per entry.

## 2026-07-27
* Prepared the first Chrome Web Store submission (v1.0.0): added [[publishing-to-the-chrome-web-store]] (package script, manifest-driven store metadata, screenshot harness) and [[2026-07-27-store-listing-positioning]] (why the name carries "Claude & Codex", why screenshots use seeded data, why the policy is on GitHub Pages). Source: this session's `scripts/package.sh`, `store/`, `docs/`, and the `manifest.json` name/description/homepage_url/minimum_chrome_version edit.

## 2026-07-21
* Fixed spurious 100% samples: `percent()` boundary `<= 1` → `< 1` so an integer `1` reads as 1% not 100% (`lib/usage.js:11`). Root cause + tradeoff in [[2026-07-21-spurious-100-percent-at-one-percent]]; updated `glossary` (`used`). Source: this session's diagnosis + repro. Tests: 21 → 23.
* Bootstrapped the wiki (Karpathy LLM-Wiki pattern, OKF-style frontmatter). Scaffolded taxonomy; wrote schema (`CLAUDE.md`), `architecture`, `glossary`, `faq`; `apps/` (background, dashboard, settings), `features/` (6 pages), `integrations/` (claude.ai + chatgpt.com, from live API responses captured this session), `workflows/`, `runbooks/`, and the first `decisions/`/`bugs/` pages. Source: full read of `background.js`, `lib/*.js`, `dashboard/*`, `settings/*`, `manifest.json`, `README.md`, `PRODUCT.md`, `test/*` at initial commit.
* Recorded [[2026-07-21-fable-no-data-limits-array]] (bug) and [[2026-07-21-limits-array-for-fable]] (decision): the claude.ai `/usage` endpoint moved the Fable weekly limit into a `limits[]` array as a `weekly_scoped` entry using `percent` + `scope.model.display_name`; `parseClaudeUsage` was extended to read it. Source: this session's live captures + `lib/usage.js` edit.
* Noted that the July 16 session transcript for this project is off-topic (an unrelated video summary) and contains no extension knowledge — not a source.
