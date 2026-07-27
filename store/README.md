# Store assets

Everything the Chrome Web Store listing needs. The copy itself lives in [`listing.md`](listing.md);
this file explains how the images are produced.

## Regenerating the screenshots

The screenshots are **not** hand-composed mockups — they are the real `dashboard/` and `settings/`
pages, rendered against a seeded synthetic history so that no real usage data is published and the
result is reproducible.

The harness lives outside the repo (it is throwaway tooling). To rebuild it:

1. Copy the extension to a scratch directory, excluding `.git`, `wiki`, `test`, `store`, `docs`.
2. Drop in a `seed.js` that defines `globalThis.chrome` with a stubbed
   `storage.local` / `alarms` / `runtime`, holding a generated 7-day `history` array in the shape
   documented in `wiki/architecture.md`.
3. Inject `<script src="../seed.js"></script>` into the `<head>` of `dashboard/index.html` and
   `settings/index.html`, **before** the module scripts — a classic script runs first, so
   `dashboard.js` sees a real `chrome` object and skips its own built-in preview data.
4. Wrap each page in a 1280×800 frame page: a caption plus a scaled `<iframe>` of the app.
5. Serve the directory over HTTP (same-origin iframes) and screenshot each frame at exactly
   1280×800.

Seed values are tuned so the numbers read as a healthy, realistic week: weekly counters are scaled
against total session burn so they never saturate at 100%, and the in-progress 5-hour window gets a
moderate peak so the trend forecast is a calm diagonal rather than a spike into the limit.

## Sizes the store expects

| Asset | Size | Required |
|---|---|---|
| Store icon | 128×128 | yes |
| Screenshot | 1280×800 (or 640×400) | at least 1, up to 5 |
| Small promo tile | 440×280 | for the store's search/category tiles |
| Marquee promo tile | 1400×560 | only for featured placement |

## Package

```bash
npm run package   # -> dist/ai-usage-timeline-<version>.zip
```

The zip contains only what Chrome loads: `manifest.json`, `background.js`, `lib/`, `dashboard/`,
`settings/`, `icons/*.png`. Repo furniture (`wiki/`, `test/`, `store/`, `docs/`, `scripts/`,
`package.json`, Markdown, `icons/icon.svg`) is excluded.
