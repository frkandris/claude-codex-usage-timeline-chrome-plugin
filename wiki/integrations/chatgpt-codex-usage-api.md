---
type: Integration
title: chatgpt.com Codex usage API
description: Undocumented internal endpoints the extension reads for Codex/ChatGPT usage, plus auth details.
resource: https://chatgpt.com/backend-api/wham/usage
tags: [codex, chatgpt, integration, undocumented-api]
timestamp: 2026-07-21
---

# chatgpt.com Codex usage API

**Undocumented, internal.** Unlike claude.ai (cookie-only), the Codex usage endpoint needs a **bearer
token** plus an account header. Consumed by `collectCodexDirect` (`background.js:31`) and the in-page
fallback (`background.js:75`); parsed by `parseCodexUsage` (`lib/usage.js:66`).

> Provenance note: the endpoints, headers, and field mappings below are documented from the
> **source code** at the initial commit — this shape was not re-captured live in the bootstrap
> session. Re-capture and update the observation date when convenient (see bottom).

## Flow

1. **Get the session + access token.**
   `GET https://chatgpt.com/api/auth/session` → read `accessToken` (or `access_token`).
   If absent, throw *"The ChatGPT session has no access token."*
2. **Derive the account id** (`extractChatGptAccountId`, `lib/usage.js:94`):
   - direct fields `accountId` / `account_id` / `account.id` / `user.account_id`, else
   - decode a JWT (`idToken` / `id_token` / `accessToken` / `access_token`) and read
     `["https://api.openai.com/auth"].chatgpt_account_id` (or a top-level `chatgpt_account_id`).
3. **Fetch usage.**
   `GET https://chatgpt.com/backend-api/wham/usage` with headers:
   - `Authorization: Bearer <accessToken>`
   - `ChatGPT-Account-Id: <accountId>` (only when an account id was found).

## What the parser extracts (`parseCodexUsage`, `lib/usage.js:66`)

The response is tolerant to several nestings. Effective limits object is the first present of
`rate_limit` / `rateLimit` / a `rate_limits[]` entry (preferring `limit_id === "codex"`, else the
first) / the payload itself.

| Wiki metric | Source window | Field read |
|-------------|---------------|------------|
| `session` | `primary_window` / `primaryWindow` / `primary` / `five_hour` / `session` | `used_percent` (via `metric()`) |
| `weekly` | `secondary_window` / `secondaryWindow` / `secondary` / `seven_day` / `weekly` | `used_percent` |

A missing weekly window is allowed (stays `null`) — the Codex card hides its weekly row until a finite
value exists (`dashboard/dashboard.js:341`). If neither window resolves, it throws *"The Codex usage
format is not recognized."*

## Gotchas / non-obvious facts

- **Two-step auth.** The token comes from `/api/auth/session`, not a cookie; the usage call is a bearer
  request. The `ChatGPT-Account-Id` header is required for multi-account users and is dug out of a JWT
  when not present as a plain field.
- **`limit_id === "codex"`** selects the right entry when the payload is a `rate_limits[]` array of
  multiple products (`lib/usage.js:68`).
- **JWT decode is base64url with manual padding** (`jwtPayload`, `lib/usage.js:81`) — it normalizes
  `-`/`_` and pads to a multiple of 4 before `atob`. Malformed tokens return `null`, not a throw.

## How to re-capture the shape when it changes
Sign in to chatgpt.com, and in the page console: `fetch("/api/auth/session").then(r=>r.json())` to get
the token/account id, then `fetch("/backend-api/wham/usage", { headers: { Authorization: "Bearer …",
"ChatGPT-Account-Id": "…" } })`. Paste the JSON here with an observation date.
