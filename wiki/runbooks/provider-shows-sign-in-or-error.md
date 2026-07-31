---
type: Runbook
title: A provider shows "Sign in" or "Error"
description: Diagnose failed collection for Claude or Codex.
timestamp: 2026-07-21
---

# Runbook: a provider shows "Sign in" or "Error"

The dashboard status pill (`renderProvider`, `dashboard/dashboard.js:115`) shows:
- **"Sign in"** — the error looked auth-shaped (`401`/`403`/"sign in"/"session"/"access token"/
  "unauthorized"/"forbidden"). Links to the provider.
- **"Error"** — some other failure; hover for the message (`status.title`).
- **"No data"** — provider enabled but no successful sample yet.

## Fix "Sign in"
Open the provider **in the same Chrome profile** and log in:
- Claude → https://claude.ai/new
- Codex → https://chatgpt.com/codex

Then refresh. Collection relies on that tab's session — Claude via cookie, Codex via the
`/api/auth/session` access token + `ChatGPT-Account-Id` header. See [[claude-ai-usage-api]] /
[[chatgpt-codex-usage-api]].

## Fix "Error"
The stored `error` string combines the tab-fallback error and the direct error
(`collectProvider`, `background.js:121`), so you see both. Common causes:
- **"format is not recognized"** → the response shape changed; go to
  [[fable-or-metric-shows-no-data]] step 4 and update the integration page + parser.
- **HTTP 4xx/5xx** → provider-side/outage; retry later.
- **"organization ID not found"** → the org-discovery walk failed; re-capture
  `/api/organizations` (or `/api/bootstrap`) and check `findOrganizationIds` (`lib/usage.js`).
- **All rows read `0%` with "No reset"** (no error at all) → likely the wrong organization; see
  [[claude-shows-zero-percent]].
- **background-tab timeout** ("The background page timed out.") → the fallback tab didn't reach
  `complete` within 20s (`waitForTab`, `background.js:41`); usually transient.

## Note
Collection tries **direct first, then a background tab** — a transient direct failure is silently
recovered if the tab fallback succeeds (`source: "background-tab"`). You only see "Error" when **both**
fail. See [[2026-07-15-direct-fetch-then-background-tab-fallback]].

## Related
[[usage-collection]] · [[claude-ai-usage-api]] · [[chatgpt-codex-usage-api]]
