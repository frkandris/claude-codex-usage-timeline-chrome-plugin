---
type: Workflow
title: Loading & reloading the extension
description: Install the unpacked extension and reload it after code changes.
timestamp: 2026-07-21
---

# Loading & reloading the extension

## First install (from `README.md`)
1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. **Load unpacked** → select the repo root (the folder with `manifest.json`).
4. Sign in to [claude.ai](https://claude.ai) and [chatgpt.com](https://chatgpt.com) **in the same
   Chrome profile** — collection uses those sessions' cookies/tokens.
5. Click the extension icon to open the dashboard, then the refresh button for a first collection.

## Reloading after a code change — REQUIRED
Chrome **caches the extension's code at load time**. Editing `background.js` / `lib/*.js` / UI files on
disk does **not** affect the running extension until you reload it:

- `chrome://extensions` → the extension's **reload** (↻) button.

Then trigger a fresh collection (dashboard refresh button) or wait for the next alarm. Old `history`
samples keep their old (possibly missing) values; only samples collected *after* the reload reflect
new parsing.

> This reload requirement is the #1 cause of "my fix didn't take" confusion — see the postmortem
> [[2026-07-21-fable-no-data-limits-array]] and runbook [[fable-or-metric-shows-no-data]].

## Related
[[development-and-testing]] · [[fable-or-metric-shows-no-data]]
