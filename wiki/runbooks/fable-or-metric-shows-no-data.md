---
type: Runbook
title: A metric shows "—" / "No data" / "No reset"
description: Diagnose a card (esp. Fable) showing a dash when the provider reports a real value.
timestamp: 2026-07-21
---

# Runbook: a metric shows "—" / "No reset" but the provider has data

Symptom: a dashboard card (classically **Fable**) shows `—` and "No reset", while the provider's own
usage page shows a real percentage.

## Triage, in order

1. **Did you reload the extension after editing parser code?**
   Chrome caches extension code; disk edits don't apply until reload. Go to `chrome://extensions` →
   ↻ reload, then click the dashboard refresh button. See [[loading-and-reloading-the-extension]].
   *This is the most common cause.*

2. **Did a fresh collection run after the reload?**
   Old `history` samples keep their old (missing) values. The card reads the **latest** sample
   (`latest`, `dashboard/dashboard.js:96`) — refresh to append a new one.

3. **Is the provider signed in, in this Chrome profile?**
   If the status pill says "Sign in", open the provider and log in. See
   [[provider-shows-sign-in-or-error]].

4. **Did the provider's response shape change?** (the real-code cause)
   Capture the live response (see [[claude-ai-usage-api]] "How to re-capture") and compare field names
   against what `parseClaudeUsage` reads. The Fable regression on 2026-07-21 was exactly this: the
   value moved into `limits[]` as a `weekly_scoped` entry using `percent` + `scope.model.display_name`
   instead of a top-level `seven_day_fable`/`utilization`. Fix pattern: extend `metric()` field list
   and/or `findNamedMetric` identity. Add a failing test first (`test/usage.test.js`).

## Verify the parser in isolation
Run the captured JSON through the pure parser in Node (no browser needed):
```bash
node --input-type=module -e '
  import("./lib/usage.js").then(({parseClaudeUsage}) =>
    console.log(parseClaudeUsage(/* paste captured JSON */)))'
```
Expect a finite `fable.used` and a `resetsAt`.

## Related
[[2026-07-21-fable-no-data-limits-array]] · [[claude-ai-usage-api]] · [[loading-and-reloading-the-extension]]
