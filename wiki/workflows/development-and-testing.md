---
type: Workflow
title: Development & testing
description: How to run tests and iterate on the extension locally.
timestamp: 2026-07-21
---

# Development & testing

## Tests
```bash
npm test        # == node --test  (package.json "scripts.test")
```
Node's built-in runner executes `test/usage.test.js` and `test/settings.test.js`. Only the pure
`lib/` layer is unit-tested (no Chrome/DOM mocks needed) — this is deliberate; see [[architecture]].
21 tests at the initial commit.

## No build
Vanilla ES modules, loaded directly by Chrome — there is **no bundler/transpiler/formatter/linter**.
Editing a file is enough; then reload the extension to load the new code. See
[[loading-and-reloading-the-extension]].

## Iterating on the UI without Chrome
`dashboard/index.html` runs standalone (outside the extension) using synthetic preview data
(`previewData`, `dashboard/dashboard.js:37`) — handy for styling. Real data requires the extension
context (`chrome.storage.local`).

## Adding a metric/provider parse (the common change)
Edit `lib/usage.js`, add a failing test in `test/usage.test.js` first, make it pass, then verify
against a **live** provider response (see [[claude-ai-usage-api]] / [[chatgpt-codex-usage-api]] for
how to capture it). This is exactly the loop used for the Fable fix
([[2026-07-21-fable-no-data-limits-array]]).

## Committing
Wiki updates land in the **same commit** as the code change that triggered them (schema rule). Remote:
GitHub `frkandris/claude-codex-usage-timeline-chrome-plugin` (`gh` available).

## Related
[[loading-and-reloading-the-extension]] · [[architecture]]
