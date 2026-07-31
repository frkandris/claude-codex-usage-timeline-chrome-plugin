---
type: Workflow
title: Publishing to the Chrome Web Store
description: How to build the upload zip, regenerate the listing screenshots, and what the store listing must say.
timestamp: 2026-07-27
---

# Publishing to the Chrome Web Store

The listing copy, permission justifications and asset inventory live in `store/listing.md` — that
file is the source of truth for what gets typed into the Developer Dashboard. This page covers the
mechanics around it.

> **Since 2026-07-31 the upload is automatic**: a push to `release` builds this same package and
> submits it through the store API — see [[release-process]] and [[chrome-web-store]]. The manual
> build below stays useful for inspecting the zip and as a fallback.

## Build the package

```bash
npm run package     # scripts/package.sh -> dist/ai-usage-timeline-<version>.zip
```

The script whitelists what Chrome actually loads — `manifest.json`, `background.js`, `lib/`,
`dashboard/`, `settings/`, `icons/*.png` — rather than blacklisting. Repo furniture (`wiki/`,
`test/`, `store/`, `docs/`, `scripts/`, `package.json`, Markdown) and `icons/icon.svg` never ship.
A missing entry fails the build loudly instead of producing a silently incomplete zip.

Bump `version` in `manifest.json` before every upload — the store rejects a re-upload of a version
that already exists. The release workflow runs this same script, so what CI ships and what
`npm run package` produces are the same bytes by construction.

## Store metadata comes from the manifest

The listing **name** and **short description** are read from `manifest.json`, not typed into the
dashboard. The store caps them at 75 and 132 characters respectively; both are currently well under
(34 and 112) and the release workflow fails the build if either limit is crossed. Changing either
means shipping a new package, not editing the listing.

`homepage_url` and `minimum_chrome_version: 111` were added for the first submission
(`manifest.json`). 111 is where `oklch()` and `color-mix()` shipped — both are load-bearing in
`dashboard/styles.css`, so anything older would render the UI with broken colours rather than
degrade gracefully.

## Regenerating the screenshots

Screenshots are the **real** `dashboard/` and `settings/` pages driven by a stubbed `chrome` API and
a generated 7-day history — not mockups, and not the developer's real usage data. The full recipe is
in `store/README.md`. The load-bearing trick:

> `dashboard.js` picks its data source with
> `globalThis.chrome?.storage?.local ? globalThis.chrome : previewApi` (`dashboard/dashboard.js:69`).
> Injecting a **classic** `<script>` that defines `globalThis.chrome` into `<head>` before the
> module scripts makes both pages render seeded data. `settings/` has no preview fallback of its
> own, so this shim is the only way to screenshot it outside the browser extension context.

Note that `chrome://` and `chrome-extension://` URLs cannot be driven by the browser-automation
tooling, which is why the harness runs the pages over plain `http://localhost` instead of
screenshotting the installed extension.

## The two URLs the listing needs

Both are served by GitHub Pages from `docs/` on `main` (see `docs/index.html`,
`docs/privacy.html`):

- Homepage — `https://frkandris.github.io/claude-codex-usage-timeline-chrome-plugin/`
- Privacy policy — `.../privacy.html`

A privacy policy URL is **mandatory** for any item that touches user data. `docs/.nojekyll` is
required because `_shared.css` starts with an underscore, which Jekyll would otherwise drop.

## Review expectations

The two provider endpoints are undocumented ([[claude-ai-usage-api]],
[[chatgpt-codex-usage-api]]), and the extension requests `tabs` + `scripting` for the fallback path
described in [[2026-07-15-direct-fetch-then-background-tab-fallback]]. Reviewers scrutinise that
combination, so each justification in `store/listing.md` names the exact call site and scope. See
[[2026-07-27-store-listing-positioning]] for the naming and trademark reasoning.

## Related
[[release-process]] · [[chrome-web-store]] · [[development-and-testing]] ·
[[loading-and-reloading-the-extension]] · [[data-export-and-retention]]
