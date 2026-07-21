---
type: Integration
title: claude.ai usage API
description: Undocumented internal endpoints the extension reads for Claude usage, with the live response shape.
resource: https://claude.ai/api/organizations/{org}/usage
tags: [claude, integration, undocumented-api]
timestamp: 2026-07-21
---

# claude.ai usage API

**Undocumented, internal.** These are the same endpoints the claude.ai web app calls; there is no
contract and they change without notice. Auth is the logged-in **session cookie** — requests use
`credentials: "include"` and no token. Consumed by `collectClaudeDirect` (`background.js:19`) and the
in-page fallback (`background.js:93`); parsed by `parseClaudeUsage` (`lib/usage.js:52`).

## Flow

1. **Discover the organization id.**
   `GET https://claude.ai/api/organizations` → on failure fall back to
   `GET https://claude.ai/api/bootstrap`. Walk the JSON for the org id with `findOrganizationId`
   (`lib/usage.js:107`): it accepts keys `organization_id` / `organization_uuid` / `org_id`, an
   `organization.uuid` object, and as a last resort the first `uuid` string it finds.
2. **Fetch usage.**
   `GET https://claude.ai/api/organizations/<org>/usage`.

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
- **`extra_usage`** describes pay-as-you-go credits (disabled here); the extension does not surface it.

## How to re-capture the shape when it changes
Sign in to claude.ai, open a tab, and in the page console run the org-discovery + usage fetch (same
two GETs above with `credentials:"include"`). Paste the JSON here with a new observation date; flag
any field renames as a contradiction in `_log.md`.
