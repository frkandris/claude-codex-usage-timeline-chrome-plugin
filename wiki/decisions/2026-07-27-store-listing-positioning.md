---
type: Decision
title: Store listing positioning — trademarked name, synthetic screenshots, Pages-hosted policy
description: Why the store name carries "Claude & Codex", why screenshots use seeded data, and why the privacy policy is hosted on GitHub Pages.
timestamp: 2026-07-27
---

# 2026-07-27 — Store listing positioning

## Context

Preparing the first Chrome Web Store submission (v1.0.0). Three choices had no obvious default and
each carries a review or privacy consequence, so they are recorded here rather than left to the
diff.

## 1. Name includes other companies' trademarks

**Decision:** ship as `AI Usage Timeline – Claude & Codex` (`manifest.json`).

**Options considered:** the neutral `AI Usage Timeline` (zero trademark surface), or the
descriptive form that names both services.

**Why:** nobody searches the store for "usage timeline" — they search for "Claude" and "Codex".
The neutral name is safer but effectively undiscoverable. Google permits nominative use of a
trademark to describe compatibility as long as the listing does not imply endorsement, so the risk
is mitigated rather than avoided: the description, `docs/privacy.html` and `docs/index.html` all
carry an explicit "independent, unofficial, not affiliated with Anthropic or OpenAI" statement, and
neither company's logo or wordmark styling is used anywhere.

**Consequences:** if a reviewer objects, the fix is a manifest rename plus a new package — the
neutral name stays available as a fallback. The disclaimer must survive every future listing edit.

## 2. Screenshots use seeded synthetic data

**Decision:** render the real `dashboard/`+`settings/` code against a generated 7-day history
rather than publishing the developer's actual usage curve.

**Why:** a real export would put genuine Claude/Codex consumption patterns on a public store page
permanently — a needless personal-data disclosure for a privacy-first extension. Seeded data is
also reproducible: any future re-shoot after a UI change looks consistent instead of depending on
whatever the account happened to be doing that week. Crucially it is still the *real* UI code
rendering, not a mockup, so the screenshots cannot drift from what the product actually shows.

**Consequences:** the seed needs tuning to stay honest — weekly counters are normalised against
total session burn so they never saturate at 100%, and the in-progress 5-hour window gets a
moderate peak so [[trend-forecast]] draws a calm diagonal instead of a spike into the limit. An
unrealistically alarming chart would misrepresent the product as much as a fabricated one.

## 3. Privacy policy on GitHub Pages, not a raw file link

**Decision:** serve `docs/privacy.html` via GitHub Pages from `main`.

**Why:** the store requires a working privacy-policy URL. A `blob/main/PRIVACY.md` link satisfies
the field but renders inside GitHub's app chrome, which reads as an unmaintained project to a
reviewer. A styled page on the project's own domain costs one folder. `PRIVACY.md` is kept at the
repo root as the plain-text source of the same text.

**Consequences:** `docs/` must stay in sync with `PRIVACY.md` — they duplicate content by design,
and both carry a "Last updated" date that has to move together.

## Related
[[publishing-to-the-chrome-web-store]] · [[data-export-and-retention]] ·
[[2026-07-15-direct-fetch-then-background-tab-fallback]]
