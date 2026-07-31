---
type: Decision
title: Collect via direct fetch, fall back to a background tab
description: Why collection tries a worker fetch first and only opens an inactive provider tab when it fails.
tags: [collection, auth, mv3]
timestamp: 2026-07-21
---

# Decision: direct fetch first, background-tab fallback second

**Date recorded:** 2026-07-21 (documenting existing behavior; feature present since the initial
commit, dated 2026-07-15 in `README.md`). **Status:** Adopted.

> Provenance: rationale is stated in `README.md` ("How it works, and privacy") and evidenced by
> `collectProvider` (`background.js:114`). No design-note transcript exists for this project (the only
> prior session transcript is unrelated), so the "why" is sourced from README + code.

## Context
An MV3 service worker can `fetch` provider usage endpoints, but a background request does not always
carry the provider's **session cookie / token**, so it can fail with an auth error even though the
user is logged in.

## Options considered
1. Direct `fetch` from the worker only.
2. Always drive an in-page fetch via an opened tab.
3. **Direct first, then open an inactive provider tab and run the same fetch in-page on failure.**

## Decision
Option 3 (`collectProvider`, `background.js:114`): try `directCollector()`; on any throw, call
`collectInBackgroundTab()` which opens an **inactive** tab at the provider, waits for load, runs the
fetch in the page's `MAIN` world via `chrome.scripting.executeScript`, and closes the tab.

## Why
- **Direct is cheap and invisible** when it works — no tab flicker, no page load.
- **The tab fallback runs in the real page origin**, so it inherits the exact session context the web
  app uses — recovering the cookie/token cases the worker can't. `README.md` states this explicitly.
- Keeping direct as the default means the expensive/visible path is only paid when necessary; `source`
  records which path served each sample.

## Consequences
- Requires `tabs` + `scripting` permissions and host permissions for both providers
  (`manifest.json`).
- Occasionally a provider tab briefly opens and closes during collection (expected; see [[faq]]).
- The fallback has a 20s load timeout (`waitForTab`, `background.js:41`); "Error" only surfaces when
  **both** paths fail. See [[provider-shows-sign-in-or-error]].

## Related
[[usage-collection]] · [[background-service-worker]] · [[provider-shows-sign-in-or-error]]
