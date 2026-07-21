---
type: Schema
title: Wiki schema — maintenance rules and page formats
description: The single source of truth for when to capture knowledge in this wiki and how to write pages.
timestamp: 2026-07-21
---

# Wiki schema

This is the **schema** for the `wiki/` LLM-maintained knowledge base of the **AI Usage Timeline**
Chrome extension. It defines *when* to capture knowledge, *how* to write pages, and the format
conventions. Every session that touches this project consults it. Pattern:
[Andrej Karpathy's LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f),
file format inspired by [Open Knowledge Format (OKF)](https://github.com/GoogleCloudPlatform/knowledge-catalog).

## The three layers

1. **Sources (read-only ground truth).** Never written to during wiki maintenance:
   - the codebase: `background.js`, `lib/`, `dashboard/`, `settings/`, `manifest.json`, `test/`;
   - version control: `git log` / `git show` / `git blame` (remote: GitHub
     `frkandris/claude-codex-usage-timeline-chrome-plugin`, CLI: `gh`);
   - prior Claude Code session transcripts under
     `~/.claude/projects/-Users-p-tothandras-Code-claude-usage-monitor-chrome-extension/`;
   - `wiki/assets/` — raw human-dropped material (notes, screenshots, transcripts).
2. **The wiki (writable, compiled artifact).** This folder. Cross-linked Markdown with Obsidian-style
   `[[wiki-link]]` links (basename, no extension — folders don't matter for resolution).
3. **The schema.** This file (`wiki/CLAUDE.md`).

## When to update the wiki (the maintenance contract — treat as a checklist)

- **New top-level runtime surface / entry point** → `apps/` (rare — there are three: background,
  dashboard, settings).
- **Non-trivial feature implemented or modified** → `features/` (add entry-point `file:line` links).
- **Architectural/design decision made** → `decisions/YYYY-MM-DD-<slug>.md` — capture the **why**.
  Skip if the why is obvious from the diff.
- **Workaround/hack added** → `hacks/`; **longer-lived accepted debt** → `tech-debt/` (+ `_index` entry).
- **Non-trivial bug fixed** → `bugs/YYYY-MM-DD-<slug>.md` — only when the root cause was surprising or
  the class is likely to recur. Skip trivial fixes the diff explains.
- **External integration touched/changed** → `integrations/` (the two provider APIs are the highest-value
  pages — they are undocumented and change without notice).
- **Script/command/workflow added/renamed/removed** → `workflows/`.
- **Non-obvious question came up** → `faq.md`; **domain term came up** → `glossary.md`.
- **Incident handled / recurring failure found** → `runbooks/`.
- **Files dropped in `assets/`** → compile them into the right pages.
- **Always** append a one-line entry to `_log.md`.

## When NOT to update

- Trivial changes: renames, formatting, dependency bumps.
- Anything already in the root `CLAUDE.md` (link, don't duplicate).
- Anything trivially derivable from code.
- Speculative future plans — the wiki describes what **is**, not what might be.
- Areas the current task didn't touch.

When in doubt, prefer linking to source (`file:line`, commit SHA, PR number) over copying.

## How to write pages

- **One concept per page.** Split anything past ~200 lines.
- **Lead with the answer, then provenance.**
- **Cross-reference liberally** with `[[page-name]]`.
- **Provenance is mandatory for non-obvious claims:** file paths with line numbers (when stable),
  commit SHAs, PR numbers, or a source URL. For the two provider APIs, cite the live response shape
  and the date it was observed — those endpoints are undocumented and mutate.
- **Flag contradictions** rather than silently overwriting: keep the truer version, note the conflict
  in `_log.md`.
- **Dates are absolute** `YYYY-MM-DD`, never "recently".

### Page skeletons

**`decisions/`** — Context / Options considered / Decision / **Why** / Consequences. The *Why* is
load-bearing.

**`bugs/`** — Symptom / **Root cause** / Fix / Lessons.

**`_log.md`** — append-only, **newest first**, one self-contained line per entry:
`YYYY-MM-DD — <what changed in the wiki, and the source (commit/PR/file) it came from>`.

## Evolving the schema

The taxonomy is a starting point, not fixed. When content genuinely fits no existing category:
create the folder + `_index.md`, add it to the tree here, add a "When to update" trigger, link it
from `index.md`, and log it. Default to **not** adding a category if an existing one absorbs the
content. Evolution should be explicit and rare.

## Tooling boundaries

- This project has **no code formatter, no linter, and no TypeScript/bundler** — nothing rewrites or
  `include`s Markdown, so the wiki needs no `.prettierignore`/ignore entries today. If a formatter is
  ever added, exclude `wiki/` from it.
- The wiki **is committed to git**. Wiki updates land in the **same commit (or PR)** as the code
  change that triggered them, so `git log` ties knowledge to implementation.
- `_log.md` is append-only; keep every entry a single self-contained line. If concurrent appends ever
  cause merge pain, add a `union` merge driver for it via `.gitattributes`.
