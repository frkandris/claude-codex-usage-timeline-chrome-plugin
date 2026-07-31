# AI Usage Timeline

Chrome Manifest V3 extension that samples how much of your Claude and Codex usage limits you have
spent, and draws the history on a shared time-series chart with trend forecasts.

## Install

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this directory.
4. Sign in to [claude.ai](https://claude.ai) and [chatgpt.com](https://chatgpt.com) in the same Chrome
   profile.
5. Click the extension icon to open the dashboard, then collect the first sample manually.

The sampling interval is configurable on the **Settings** page (from the dashboard header): 5, 10, 15,
30 or 60 minutes, 15 by default. The same page toggles Claude and Codex collection independently and
picks which metric the toolbar badge shows.

## Metrics

Which rows appear depends on what your plan exposes — a metric with no data is hidden rather than
shown as zero.

- **Claude** — 5-hour session window, weekly (all models), and the weekly Fable limit.
- **Codex** — the windows ChatGPT reports, classified by their declared length: up to 24 hours counts
  as the 5-hour row, anything longer as the weekly row. Some plans have no 5-hour window at all.

## How it works, and privacy

- The extension reads the same undocumented internal usage endpoints that the two web apps use.
- If the direct background request does not get the session cookie, it briefly opens an inactive tab
  on the provider, reads the same JSON there, and closes the tab.
- An account can belong to several organizations; for Claude the extension tries each candidate and
  keeps the one that reports real usage.
- It never reads conversations, prompts, or API keys.
- Every sample stays in `chrome.storage.local` for at most 90 days. Export to CSV or clear the history
  from the Settings page.
- The internal endpoints change without notice, so the dashboard reports it explicitly when a
  provider's response is no longer recognized.

## Tests

```bash
npm test
```

## Project knowledge base

`wiki/` documents the architecture, the two provider APIs, past bugs, and the runbooks. Start with
`wiki/index.md`.
