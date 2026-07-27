# Chrome Web Store listing — AI Usage Timeline

Source of truth for everything typed into the Developer Dashboard. Keep this in sync with what is
actually submitted; update it whenever the listing changes.

- **Item URL:** _(fill in after the first draft is saved)_
- **Package:** `dist/ai-usage-timeline-<version>.zip` — build with `npm run package`
- **Visibility:** Public
- **Category:** Developer Tools
- **Language:** English

---

## Name (from `manifest.json`, 34 chars)

```
AI Usage Timeline – Claude & Codex
```

## Short description (from `manifest.json`, 112 / 132 chars)

```
See how much of your Claude and Codex usage limits you have burned, on one local timeline with a trend forecast.
```

## Detailed description

```
Claude and Codex both meter you with rolling usage limits, but neither shows you the shape of your
own consumption. AI Usage Timeline samples both services in the background and draws them on a
single chart, so you can see at a glance how fast you are burning through a window and roughly
where you will land before it resets.

WHAT IT TRACKS

• Claude — the 5-hour window, the weekly window, and the per-model weekly window when your plan
  exposes one.
• Codex — the 5-hour window and the weekly window when present.
• Every measurement is timestamped and kept for up to 90 days.

FEATURES

• One shared timeline. All windows from both services on the same axis, with each service in its
  own colour and each window in its own line style.
• Trend forecast. A linear projection of your recent slope, ending either at the moment the limit
  would be exhausted or at the next reset — whichever comes first.
• Any range. 30 minutes, hours, 24 hours, 48 hours, 7 days, 30 days, or the full history.
• Toolbar badge. Put one number of your choice on the extension icon and read it without opening
  anything.
• Your interval. Measure every 5, 10, 15, 30 or 60 minutes.
• Either service, or both. Turn Claude or Codex off entirely and the chart adapts.
• Point-level control. Hover any sample to inspect it, click to delete a bad reading.
• CSV export and one-click history wipe.

PRIVACY

Everything stays on your computer. There is no server, no account, no analytics, and no
third-party service of any kind. Measurements live in Chrome's local extension storage and are
never uploaded anywhere.

The extension reads only two numbers per window — the percentage of the limit consumed and the
time it resets. It never reads your conversations, prompts, completions, files, or API keys, and
it does not touch any site other than claude.ai and chatgpt.com.

Full policy: https://frkandris.github.io/claude-codex-usage-timeline-chrome-plugin/privacy.html

HOW IT WORKS

Sign in to claude.ai and chatgpt.com in the same Chrome profile. The extension then reads the same
internal usage endpoints the two web apps use for their own limit indicators, reusing the session
already in your browser. If a background request cannot use that session, the extension briefly
opens an inactive tab on the provider's own site, reads the same data there, and closes it again.

Those endpoints are internal and undocumented, so they can change without notice. When a response
stops being recognisable the extension says so on the affected service rather than showing a
misleading number.

OPEN SOURCE

https://github.com/frkandris/claude-codex-usage-timeline-chrome-plugin

NOT AFFILIATED

AI Usage Timeline is an independent, unofficial tool. It is not affiliated with, endorsed by or
sponsored by Anthropic (Claude) or OpenAI (Codex, ChatGPT). All trademarks belong to their
respective owners.
```

---

## Graphic assets

| Slot | File | Size |
|---|---|---|
| Store icon | `icons/icon-128.png` | 128×128 |
| Screenshot 1 | `store/screenshots/shot-01-timeline.png` | 1280×800 |
| Screenshot 2 | `store/screenshots/shot-02-forecast.png` | 1280×800 |
| Screenshot 3 | `store/screenshots/shot-03-week.png` | 1280×800 |
| Screenshot 4 | `store/screenshots/shot-04-single.png` | 1280×800 |
| Screenshot 5 | `store/screenshots/shot-05-settings.png` | 1280×800 |
| Small promo tile | `store/promo/promo-small-440x280.png` | 440×280 |
| Marquee promo tile | `store/promo/promo-marquee-1400x560.png` | 1400×560 |

Screenshots are rendered from the real dashboard and settings code against a seeded, synthetic
7-day history — see `store/README.md` for how to regenerate them.

## Support and policy URLs

- Privacy policy: `https://frkandris.github.io/claude-codex-usage-timeline-chrome-plugin/privacy.html`
- Homepage: `https://frkandris.github.io/claude-codex-usage-timeline-chrome-plugin/`
- Support: `https://github.com/frkandris/claude-codex-usage-timeline-chrome-plugin/issues`

---

## Privacy tab answers

**Single purpose**

```
The extension has one purpose: to record how much of the user's Claude and Codex usage limits have
been consumed and to display that history as a timeline with a trend forecast. Every permission
below serves only that measurement-and-display loop.
```

**Permission justifications**

| Permission | Justification |
|---|---|
| `alarms` | Schedules the periodic measurement. The user picks an interval of 5, 10, 15, 30 or 60 minutes and a `chrome.alarms` alarm triggers one usage sample at that cadence. There is no other way to run a Manifest V3 service worker on a schedule. |
| `storage` | Stores the measurement history and the user's settings in `chrome.storage.local`. This is the extension's only data store; nothing is sent anywhere else. |
| `tabs` | Needed for the fallback collection path. When a background `fetch` does not carry the user's session, the extension opens one inactive tab on the provider's own site, reads the usage JSON there, and immediately closes that tab. `tabs` is required to create and remove it. |
| `scripting` | Executes the usage request inside that temporary fallback tab via `chrome.scripting.executeScript`. It runs only on `claude.ai` and `chatgpt.com`, and only reads the usage JSON. |
| Host: `https://claude.ai/*` | Reads the organization id and the usage-limit utilization for Claude. The extension cannot measure Claude limits without requesting Claude's own usage endpoint. |
| Host: `https://chatgpt.com/*` | Reads the account id and the Codex usage-limit utilization. The extension cannot measure Codex limits without requesting ChatGPT's own usage endpoint. |

**Remote code:** No — the extension executes no remote code. All JavaScript ships inside the
package; there is no bundler, no CDN, and no `eval` of fetched content.

**Data usage disclosure:** none of the categories are collected. The extension reads usage
percentages and reset timestamps, keeps them in local extension storage, and never transmits them
off the device — to the developer or to anyone else.

Certifications to tick:
- [x] I do not sell or transfer user data to third parties, apart from the approved use cases
- [x] I do not use or transfer user data for purposes unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes
