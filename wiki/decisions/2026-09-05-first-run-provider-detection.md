---
type: Decision
title: A fresh install lets the first collection pick its providers
description: Why the worker switches off a provider that answered nothing on a brand-new install, and why only on a brand-new install.
timestamp: 2026-09-05
---

# A fresh install lets the first collection pick its providers

## Context

Defaults ship both providers enabled and the badge on `claude-session` (`DEFAULT_BADGE_TARGET` and
`normalizeProviderSettings`, `lib/settings.js`) — this
decision does not change those defaults, only what happens to them on a brand-new profile.
Most people have only one of the two signed in. For them the extension used to open on a half-broken
page: an empty Codex card, an empty Codex line in the legend, and — if the default badge target's
provider was the missing one — a permanent `!` on the toolbar icon. Nothing was wrong; the extension
simply asked about a service the person does not use.

The information needed to fix this arrives on its own: the first collection either reads a provider
or it does not.

## Options considered

1. **Ask on install** (an onboarding page with two checkboxes). Correct, but it puts a form in front
   of someone who has not seen the product yet, and it asks a question the extension can answer.
2. **Hide a provider whenever its latest collection failed.** No flag, no state. Rejected: a
   sign-out, an expired session or one flaky fetch would then silently remove a provider the person
   uses, and re-add it later — the chart would gain and lose a line on its own.
3. **Decide once, on the first collection that reads anything, and never again.** Chosen.

## Decision

`collectUsage` (`background.js`) computes `presence = { claude, codex }` from the sample it just
built (`hasReading`, `lib/usage.js`) and hands it, with the stored settings, to
`firstRunProviderSettings` (`lib/settings.js`). That one pure function owns the whole rule and
returns the settings to persist, or `null` when the question is not this collection's to answer:

- already settled (`providersInitialized`) — by an earlier collection or an explicit save;
- nothing read yet (neither provider answered) — the next collection asks again;
- otherwise it switches off the provider that answered nothing and points the badge at the survivor —
  Claude first, then Codex, then `none`. `normalizeProviderSettings` supplies that fallback order, so
  the ordering rule lives in one place. When **both** answered it returns the settings unchanged: no
  provider to drop, but the question is settled all the same.

The caller records `providersInitialized: true` alongside the returned settings, in the same
`storage.local.set` as `history` and `status`, so the dashboard re-renders once, already correct.

**The settings are re-read after the collection, not reused from before it.** A collection can run
for tens of seconds — the background-tab fallback alone waits up to 20 s — and the settings page
writes directly to `chrome.storage.local`. Deciding from the pre-fetch snapshot would let a
late-finishing first collection roll back provider switches the person had just saved by hand. This
was caught in review rather than in use; the fresh read also means a second, concurrent collection
sees the first one's decision instead of repeating it.

Three things end the first-run phase, so it can never fire twice or on the wrong profile:

- the first collection that reads **anything** (both answered → nothing to change, flag set anyway);
- any explicit save on the settings page (`settings/settings.js`) and the `update-settings` message;
- `onInstalled` with a reason other than `"install"` — an **update** grandfathers the existing
  profile, whose provider switches the person already set by hand or lived with.

The badge's own metric is still corrected afterwards by `resolveBadgeTarget`, so an account whose
plan has no 5-hour window lands on `codex-weekly` rather than showing `!`
([[2026-07-31-codex-weekly-window-labelled-5h]]).

## Why

The failure this prevents is a *first impression*: the state a person sees in the first minute
decides whether the extension looks broken. A one-shot decision buys that without the two costs of
the alternatives — no onboarding form, and no provider that appears and disappears with the network.

Presence is deliberately "the fetch returned a number", not `hasLiveUsage`. An account that answers
with zeroes is an account the person **has**; only a provider that could not be read at all is
treated as absent. Disabling a working provider is a much worse error than leaving an unused one on.

## Consequences

- A fresh install where both providers are readable behaves exactly as before.
- A fresh install where neither is readable (nobody signed in yet) decides nothing and retries on
  every collection until one answers — the flag is only set once something is read.
- Someone who wants the switched-off provider back turns it on in [[settings]]; that save sets the
  flag, so it stays on — even if the collection that would have switched it off is still in flight.
- Existing installs are untouched: the `onInstalled` update branch sets the flag before the first
  collection of the new version runs.

## Related
[[settings]] · [[background-service-worker]] · [[toolbar-badge]] · [[usage-collection]]
