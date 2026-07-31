---
type: Integration
title: chatgpt.com Codex usage API
description: Undocumented internal endpoints the extension reads for Codex/ChatGPT usage, plus auth details.
resource: https://chatgpt.com/backend-api/wham/usage
tags: [codex, chatgpt, integration, undocumented-api]
timestamp: 2026-07-31
---

# chatgpt.com Codex usage API

**Undocumented, internal.** Unlike claude.ai (cookie-only), the Codex usage endpoint needs a **bearer
token** plus an account header. Consumed by `collectCodexDirect` (`background.js:31`) and the in-page
fallback (`background.js:75`); parsed by `parseCodexUsage` (`lib/usage.js:66`).

> Provenance: response shape below captured **live on 2026-07-31** (team plan, page console). The
> auth flow and the tolerant field fallbacks are documented from the source code at the initial commit.

## Observed response (2026-07-31, `plan_type: "team"`)

```json
{
  "user_id": "user-…", "account_id": "…", "email": "…", "plan_type": "team",
  "rate_limit": {
    "allowed": true, "limit_reached": false,
    "primary_window": { "used_percent": 2, "limit_window_seconds": 604800,
                        "reset_after_seconds": 431811, "reset_at": 1785936346 },
    "secondary_window": null
  },
  "code_review_rate_limit": null, "additional_rate_limits": null,
  "credits": { "has_credits": false, "unlimited": false, "overage_limit_reached": false, "balance": null },
  "spend_control": { "reached": false, "individual_limit": null },
  "rate_limit_reached_type": null, "promo": null,
  "rate_limit_reset_credits": { "available_count": 3, "applicable_available_count": 0 }
}
```

**`reset_at` is Unix seconds**, handled by `resetTime()`'s `< 1e12` → `× 1000` branch (`lib/usage.js:19`).

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

Two candidate windows are picked up positionally first:

| Candidate | Keys tried |
|-----------|------------|
| primary | `primary_window` / `primaryWindow` / `primary` / `five_hour` / `session` |
| secondary | `secondary_window` / `secondaryWindow` / `secondary` / `seven_day` / `weekly` |

…and then **classified by declared window length**, which overrides the position: a window declaring
`limit_window_seconds` (also `limitWindowSeconds` / `window_seconds` / `windowSeconds`, plus the
`*_minutes` variants) of **≤ 24 h becomes `session`**, **> 24 h becomes `weekly`**. Windows that
declare no length keep the positional mapping. The percentage itself comes from `used_percent` via
`metric()`.

**Why:** on some plans (team, 2026-07-31) the account has *no* 5-hour window — the weekly limit is the
one sitting in `primary_window`. Trusting the slot displayed a weekly reading under the "5 hours"
label; see [[2026-07-31-codex-weekly-window-labelled-5h]].

Either metric may be absent (stays `null`) — the Codex card hides the row and the chart series for a
metric with no data, keeping the 5-hour row as the placeholder when neither has any
(`dashboard/dashboard.js`, `render()`). If neither window resolves, it throws *"The Codex usage format
is not recognized."*

Samples stored before 2026-07-31 carry the old positional labels; `migrateCodexWindows`
(`lib/usage.js`) relabels them on extension install/startup using the same 24 h rule applied to
`resetsAt − timestamp`.

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
