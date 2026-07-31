---
type: Runbook
title: Claude shows 0% / "No reset" while claude.ai shows real usage
description: Diagnose the wrong-organization case — an account with several organizations, only one of which holds the usage.
timestamp: 2026-07-31
---

# Runbook: Claude reads 0% with "No reset"

**Symptom.** Every Claude row reads `0%` and "No reset" (not "—", not an error pill), while
claude.ai / the desktop app shows real numbers for the same signed-in account. Reported 2026-07-31 on
a **Team** account; the Codex card on the same machine was fine.

**Most likely cause.** The account belongs to **more than one organization**, and collection read the
wrong one. `GET /api/organizations` returns an array; a non-chat or unused organization answers
`/usage` with all-zero limits and no reset timestamps — a valid 200, so nothing errors, and the
dashboard faithfully plots zeroes.

Real example (2026-07-31, this project's own account):

| org | `capabilities` | `/usage` |
|-----|----------------|----------|
| `office@strt.hu's Organization` | `["chat", "claude_max"]` | 200 — `five_hour: 26`, `seven_day: 10` |
| `Andris's Individual Org` | `["api", "api_individual"]` | **403** |

Order in the array decides which one a single-pick walk lands on — so the same code can work on one
account and read zeroes (or error) on another.

## Triage

1. **Confirm the account matches.** The Chrome profile must be signed in as the account whose usage
   you expect — the desktop app's account is irrelevant to what Chrome sends.
2. **List the organizations and their usage.** On claude.ai, in the page console:

   ```js
   const orgs = await fetch("/api/organizations", { credentials: "include" }).then(r => r.json());
   for (const o of orgs) {
     const r = await fetch(`/api/organizations/${o.uuid}/usage`, { credentials: "include" });
     console.log(o.name, o.capabilities, r.status, r.ok ? await r.json() : "");
   }
   ```

   - **One org, real numbers** → not this problem; go to [[fable-or-metric-shows-no-data]].
   - **Several orgs, one with numbers** → this problem. The extension (from 2026-07-31) tries every
     candidate and keeps the first with live usage; make sure the installed build is new enough —
     a Web Store install only gets the fix once the new version is published.
   - **All orgs zero** → the account genuinely has no usage in any org, or usage moved out of
     `/usage`; re-capture the shape into [[claude-ai-usage-api]].
3. **Check which org got cached.** `chrome.storage.local.get("claudeOrganizationId")` from the
   extension's service-worker console. Clearing that key forces a fresh scan on the next collection.

## Why zeroes and not an error
`parseClaudeUsage` only throws when *no* metric resolves. An unused organization returns well-formed
limits that happen to be `0`, so parsing succeeds. `hasLiveUsage` (`lib/usage.js`) exists exactly to
tell "0% because unused" apart from "0% because wrong organization": usage above zero **or** any reset
timestamp counts as live.

## Related
[[claude-ai-usage-api]] · [[usage-collection]] · [[provider-shows-sign-in-or-error]] ·
[[fable-or-metric-shows-no-data]] · [[loading-and-reloading-the-extension]]
