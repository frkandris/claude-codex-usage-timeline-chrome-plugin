---
type: Integration
title: Chrome Web Store
description: Publishing target and the automated upload path — credentials, constraints, and what stays manual.
resource: https://developer.chrome.com/docs/webstore/api
tags: [cws, publishing, release, github-actions]
timestamp: 2026-07-31
---

# Chrome Web Store

The extension is published as a Web Store item; users get updates through Chrome's own auto-update
once a submission passes review. Pushing to the `release` branch uploads and submits the package
automatically — see [[release-process]] for the full flow.

Item id `pakalpjlkpcabadlkmbglcafigpjkocm` (also the repo variable `CWS_EXTENSION_ID`); the public
listing is
`https://chromewebstore.google.com/detail/ai-usage-timeline-%E2%80%93-claud/pakalpjlkpcabadlkmbglcafigpjkocm`
— the slug carries an escaped en dash and Chrome truncates it to `claud`, so copy it rather than
rebuilding it. The [[dashboard]] footer links there. First
submission was v1.0.0 on 2026-07-27 — verified 2026-07-31 by asking the CRX update service, which is
the cheapest way to see which version the store actually serves:

```bash
curl -sS -o /dev/null -w '%{redirect_url}\n' \
  "https://clients2.google.com/service/update2/crx?response=redirect&prodversion=140&acceptformat=crx3&x=id%3D<id>%26uc"
# → …/PAKALPJLKPCABADLKMBGLCAFIGPJKOCM_1_0_0_0.crx
```

## Automated publishing (since 2026-07-31)

`.github/workflows/release.yml` runs on every push to `release`: tests → manifest check → one ZIP →
GitHub Release → **upload + publish via the CWS API** (plain `curl`, no third-party action, mirroring
`strt-chrome-extension`). It **skips the store step with a warning** when the credentials are absent,
so the GitHub Release never depends on it.

Repo **variable**: `CWS_EXTENSION_ID`. Repo **secrets**: `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`,
`CWS_REFRESH_TOKEN`.

The two API calls the workflow makes:

```
PUT  https://www.googleapis.com/upload/chromewebstore/v1.1/items/<id>     → uploadState: SUCCESS
POST https://www.googleapis.com/chromewebstore/v1.1/items/<id>/publish    → status: OK | ITEM_PENDING_REVIEW
```

Anything else in `status` fails the job. `ITEM_PENDING_REVIEW` is a success — review takes days.

**First automated submission: v1.0.1 on 2026-07-31** (run 30659104678, 22 s end to end,
`uploadState: SUCCESS` → `status: OK`). The first attempt that day skipped the store step because the
secrets had been created empty — see the piping note in the setup steps below.

## One-time credential setup

Same Google Cloud recipe as `strt-chrome-extension`; if that project's OAuth client belongs to the
same publisher account, **its client id / secret / refresh token work here too** — only
`CWS_EXTENSION_ID` differs per item.

1. Google Cloud Console → project → **APIs & Services → Library** → enable **Chrome Web Store API**.
2. **OAuth consent screen**: creating the app as **Internal** under the `strt.hu` org avoids the
   7-day refresh-token expiry that *Testing* External apps suffer from. (This was the trap that cost
   the other repo a day.)
3. **Credentials → Create credentials → OAuth client ID → Desktop app** → note the id and secret.
4. Get a refresh token: open
   `https://accounts.google.com/o/oauth2/auth?response_type=code&scope=https://www.googleapis.com/auth/chromewebstore&client_id=<CLIENT_ID>&redirect_uri=http://localhost&access_type=offline&prompt=consent`,
   approve as the publisher, copy the `code=` value from the localhost redirect, then exchange it:
   `curl -d "client_id=<ID>" -d "client_secret=<SECRET>" -d "code=<CODE>" -d "grant_type=authorization_code" -d "redirect_uri=http://localhost" https://oauth2.googleapis.com/token`
5. Store them on this repo — **pipe the value in**, because `gh secret set NAME` with nothing on
   stdin silently creates an *empty* secret, and an empty secret looks exactly like an unset one
   (this cost the first automated run on 2026-07-31):

   ```bash
   printf %s '<value>' | gh secret set CWS_CLIENT_ID
   printf %s '<value>' | gh secret set CWS_CLIENT_SECRET
   printf %s '<value>' | gh secret set CWS_REFRESH_TOKEN
   gh variable set CWS_EXTENSION_ID --body '<item id>'
   ```

   The workflow's credential check names which one is empty, so the job log tells you what to fix.

The OAuth account must have access to **this** item — with a group publisher, be a member of it.

## Hard constraints (violations block the upload)

- `manifest.json` `description` ≤ **132 characters** — checked in the workflow before packaging, so it
  fails in CI rather than at upload time. (Currently 46.)
- The publisher account needs a verified contact email (account-level page in the dashboard).
- The package must not contain anything the extension does not load — that allowlist lives in
  `scripts/package.sh`, which both CI and manual uploads use. See
  [[publishing-to-the-chrome-web-store]].
- `name` ≤ 75 characters: the store reads the listing name from the manifest too. Also checked in CI.

## What stays manual

The API replaces the **package** only. Listing copy (`store/listing.md`), screenshots, the
privacy-practices answers and per-permission justifications are dashboard work — all of that is
documented in [[publishing-to-the-chrome-web-store]], including why the permissions this extension
asks for draw reviewer attention.

Also note the gallery **cannot be scripted by extensions** ("The extensions gallery cannot be
scripted"), so browser automation can't do a dashboard pass — that is exactly why the package path is
API-driven.

## Related
[[release-process]] · [[usage-collection]] · [[loading-and-reloading-the-extension]]
