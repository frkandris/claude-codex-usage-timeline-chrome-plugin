---
type: Integration
title: claude.ai usage API
description: Undocumented internal endpoints the extension reads for Claude usage, with the live response shape.
resource: https://claude.ai/api/organizations/{org}/usage
tags: [claude, integration, undocumented-api]
timestamp: 2026-10-01
---

# claude.ai usage API

**Undocumented, internal.** These are the same endpoints the claude.ai web app calls; there is no
contract and they change without notice. Auth is the logged-in **session cookie** — requests use
`credentials: "include"` and no token. Consumed by `collectClaudeDirect` (`background.js:19`) and the
in-page fallback (`background.js:93`); parsed by `parseClaudeUsage` (`lib/usage.js:52`).

## Flow

1. **Discover the organization ids.**
   `GET https://claude.ai/api/organizations` → on failure fall back to
   `GET https://claude.ai/api/bootstrap`. `findOrganizationIds` (`lib/usage.js`) walks the JSON and
   returns **up to 5 candidates**, best guess first: explicit `organization_id` / `organization_uuid` /
   `org_id` / `organization.uuid` keys, then objects whose `capabilities` include `"chat"`, then any
   remaining `uuid` string. (`findOrganizationId` is the single-value wrapper.)
2. **Fetch usage, per candidate, until one reports real numbers.**
   `GET https://claude.ai/api/organizations/<org>/usage`; keep the first parse that satisfies
   `hasLiveUsage` (non-zero usage or any reset timestamp), and cache its org id under
   `claudeOrganizationId` so later collections start there. Fall back to the first parseable
   response if none looks live.

**An account usually has more than one organization.** Observed 2026-07-31 on this project's account:

| org | `capabilities` | `/usage` |
|-----|----------------|----------|
| `office@strt.hu's Organization` | `["chat", "claude_max"]` | 200 — `five_hour: 26`, `seven_day: 10` |
| `Andris's Individual Org` | `["api", "api_individual"]` | **403** |

Picking one blindly is a coin flip between real data, a 403 ("Sign in" pill), and a well-formed
all-zero response that silently plots as 0% — see [[claude-shows-zero-percent]].

## Live response shape — observed 2026-07-20/21 (Max 20× plan)

```jsonc
{
  "five_hour":  { "utilization": 18, "resets_at": "2026-07-20T12:20:00.857620+00:00",
                  "limit_dollars": null, "used_dollars": null, "remaining_dollars": null },
  "seven_day":  { "utilization": 27, "resets_at": "2026-07-24T04:00:00.857645+00:00", … },

  // Legacy per-scope top-level keys — ALL null now (do not rely on them):
  "seven_day_oauth_apps": null, "seven_day_opus": null, "seven_day_sonnet": null,
  "seven_day_cowork": null, "seven_day_omelette": null,
  "tangelo": null, "iguana_necktie": null, "omelette_promotional": null,
  "nimbus_quill": null, "cinder_cove": null, "amber_ladder": null,

  "extra_usage": { "is_enabled": false, "monthly_limit": 2000, "used_credits": 0,
                   "utilization": 0, "currency": "EUR", … },

  // The newer, structured source of truth:
  "limits": [
    { "kind": "session",       "group": "session", "percent": 18, "severity": "normal",
      "resets_at": "…", "scope": null, "is_active": false },
    { "kind": "weekly_all",    "group": "weekly",  "percent": 27, "severity": "normal",
      "resets_at": "…", "scope": null, "is_active": true },
    { "kind": "weekly_scoped", "group": "weekly",  "percent": 2,  "severity": "normal",
      "resets_at": "2026-07-24T04:00:00+00:00",
      "scope": { "model": { "id": null, "display_name": "Fable" }, "surface": null },
      "is_active": false }
  ]
}
```

## What the parser extracts (`parseClaudeUsage`, `lib/usage.js:52`)

| Wiki metric | Source in response | Field read |
|-------------|--------------------|------------|
| `session` | `five_hour` (or `current_session` / `session`) | `utilization` |
| `weekly` | `seven_day` (or `weekly` / `seven_day_all_models`) | `utilization` |
| `fable` | tree-walk → the `limits[]` entry whose `scope.model.display_name` matches `/fable/i` | `percent` |

`metric()` (`lib/usage.js:26`) reads the utilization from the first present of
`utilization` / `used_percent` / `usedPercent` / `percentage` / **`percent`**; `resetTime()` parses
`resets_at`. If none of session/weekly/fable resolve, it throws *"The Claude usage format is not
recognized."* so the UI shows "Error" rather than fake zeros.

## Gotchas / non-obvious facts

- **Fable is not a top-level key.** It is a `weekly_scoped` entry inside `limits[]`, and its
  percentage field is `percent`, **not** `utilization`. Both mismatches once broke Fable parsing — see
  [[2026-07-21-fable-no-data-limits-array]] and the fix [[2026-07-21-limits-array-for-fable]].
- **`findNamedMetric` matches on `scope.model.display_name` and `scope.model.id`** (added
  `lib/usage.js:41`), because the model name is nested under `scope.model`, not on a top-level
  `model` field.
- **Legacy `seven_day_*` and codename keys are all `null`** in the current shape. `session` and
  `weekly` still come from `five_hour`/`seven_day` (which retain `utilization`), which is why only
  Fable regressed when the format shifted.
- **`resets_at` is offset ISO 8601 with sub-second precision** (e.g. `…04:00:00.857645+00:00`). The
  four rows can carry slightly different sub-second stamps within one response.
- **Reset time renders ~2h ahead of the raw UTC** in the UI (e.g. `04:00Z` → "Resets … 06:00" in
  CEST) — that is local-timezone formatting (`Intl.DateTimeFormat`), not a bug.
- **`extra_usage`** only says credits are enabled and how much was spent (`used_credits: 14294` minor
  units, `monthly_limit: null`, observed 2026-10-01) — it has **no remaining balance**. The extension
  reads the balance from `/prepaid/credits` instead (next section).

## Prepaid credits — `GET /api/organizations/{org}/prepaid/credits`

Observed 2026-10-01, the call the *Settings → Usage* panel makes (balance shown as "Remaining €29.94"):

```jsonc
{ "amount": 2890, "currency": "EUR",
  "balance": { "money": { "amount_minor": 2890, "currency": "EUR", "exponent": 2 }, "credits": null },
  "tranches": [{ "remaining_amount_minor_units": 2889, "granted_amount_minor_units": 21250,
                 "granted_at": "2026-09-30T14:41:25Z", "expires_at": null,
                 "program_id": "prepaid_additional_usage_individual" }],
  "auto_reload_settings": null }
```

Amounts are **minor units** (÷ `10 ** exponent`). The extension requests this only while a Claude limit
is at 100% (`isClaudeLimitReached`) — that is when credits are spent — and attaches the response to the
usage payload as `prepaid_credits` so `parseClaudeUsage` returns `credits: { used, remaining, currency }`
(`parseClaudeCredits`, `lib/usage.js`). `used` = spent share of the granted tranches, so the series
climbs like the others. A failed credits request leaves the rest of the reading intact.

## How to re-capture the shape when it changes
Sign in to claude.ai, open a tab, and in the page console run the org-discovery + usage fetch (same
two GETs above with `credentials:"include"`). Paste the JSON here with a new observation date; flag
any field renames as a contradiction in `_log.md`.
