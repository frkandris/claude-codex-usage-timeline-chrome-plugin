---
type: Workflow
title: Release process
description: How a change reaches users — version bump, release notes, push to `release`, automated GitHub Release and Chrome Web Store submission.
tags: [release, versioning, github-actions, cws]
timestamp: 2026-07-31
---

# Release process

**One trigger: `git push origin main:release`.** Pushing to `main` never releases anything.

## What the push does (`.github/workflows/release.yml`)

1. `npm test` — a red test stops the release. This is the only gate the project has.
2. Reads `manifest.json`: validates the version format and the store's limits on `name` (75) and
   `description` (132) — the listing shows both, so they are release blockers.
3. `npm run package` — the same `scripts/package.sh` a manual upload uses, so CI and local builds
   cannot drift apart. One `dist/ai-usage-timeline-<version>.zip` serves both destinations. What it
   contains and why: [[publishing-to-the-chrome-web-store]].
4. Extracts the `## vX.Y.Z` section of `RELEASE_NOTES.md` matching the manifest version, and creates
   GitHub Release `vX.Y.Z` with the ZIP attached (deleting a same-version release first, so a
   re-push overwrites rather than fails).
5. Uploads and publishes to the Chrome Web Store — **only if** the credentials are configured;
   otherwise it logs a warning and the GitHub Release still stands. See [[chrome-web-store]].

## Before pushing to `release`

1. Bump `version` in `manifest.json` (patch = fix/tweak, minor = new feature).
2. Prepend a `## vX.Y.Z` section to `RELEASE_NOTES.md`, written for users, not for the diff.
3. Update the wiki pages the change touched and append to `_log.md` — same commit as the code.
4. `npm test` locally, and reload the unpacked extension to check the real UI
   ([[loading-and-reloading-the-extension]]).
5. If the UI or the listing copy changed, refresh `store/listing.md` and the screenshots — the API
   replaces the package only ([[publishing-to-the-chrome-web-store]]).

## Traps

- **Forgetting the `release` push** leaves GitHub and the store stale while `main` advances. The
  other STRT extension sat five versions behind for weeks this way.
- **Re-releasing the same version** is fine on GitHub (the workflow deletes and recreates it) but the
  Chrome Web Store rejects an unchanged version number — bump before re-pushing.
- **Pushing workflow files needs the `workflow` scope** on the git PAT; `repo` alone fails with
  *refusing to allow a Personal Access Token to create or update workflow*.
- **Review takes days.** `ITEM_PENDING_REVIEW` in the job output is success, not a problem.

## Related
[[chrome-web-store]] (credentials, API) · [[publishing-to-the-chrome-web-store]] (package contents,
listing, screenshots) · [[development-and-testing]] · [[loading-and-reloading-the-extension]]
