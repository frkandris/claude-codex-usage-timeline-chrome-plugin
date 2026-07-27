# Privacy Policy — AI Usage Timeline

**Last updated: 2026-07-27**

AI Usage Timeline is a Chrome extension that samples how much of your Claude and Codex usage
limits you have consumed and draws that history on a local timeline.

## The short version

The extension stores everything it measures **on your own computer**. It has no server, no
account, no analytics, and no third-party services. No data is ever transmitted to the developer
or to anyone else.

## What the extension reads

While you are signed in to the services in the same Chrome profile, the extension periodically
requests the same internal usage endpoints that the web apps themselves use:

- `https://claude.ai` — your organization id and your usage-limit utilization
  (5-hour window, weekly window, and the per-model weekly window when present).
- `https://chatgpt.com` — your account id and your Codex usage-limit utilization
  (5-hour window and weekly window when present).

From those responses it keeps only two kinds of numbers: a **percentage** (0–100) of the limit
consumed, and the **timestamp** at which that limit resets.

The extension does **not** read, store, or transmit your conversations, prompts, completions,
files, API keys, passwords, or the contents of any other website.

## What is stored, and where

All measurements and settings are written to `chrome.storage.local`, which lives in your Chrome
profile on your device. Measurements older than **90 days** are deleted automatically.

Nothing is uploaded. The only network requests the extension makes are to `claude.ai` and
`chatgpt.com`, authenticated with the session cookies already present in your browser — exactly
as if you had opened those pages yourself.

If a background request cannot use your session, the extension briefly opens an inactive tab on
the provider's own site, reads the same usage JSON there, and closes the tab again.

## Permissions and why they are needed

| Permission | Why |
|---|---|
| `alarms` | Schedule the periodic measurement (every 5–60 minutes, your choice). |
| `storage` | Keep the measurement history and your settings locally. |
| `tabs` | Open and close the temporary fallback tab described above. |
| `scripting` | Run the usage request inside that fallback tab. |
| `claude.ai`, `chatgpt.com` host access | Read the usage endpoints of those two services. |

## Your control over the data

- **Export CSV** on the settings page writes the full history to a file you choose.
- **Clear history** on the settings page deletes every stored measurement immediately.
- Disabling either service stops all requests to it.
- Uninstalling the extension removes all stored data with the Chrome profile data.

## Data sharing and sale

The developer does not collect, receive, sell, rent, or share any user data. There is nothing to
share — the data never leaves your machine.

## Changes to this policy

Any change will be published on this page with a new "Last updated" date, in the extension's
public repository.

## Contact

Questions or reports: **andris@strt.hu**, or open an issue at
<https://github.com/frkandris/claude-codex-usage-timeline-chrome-plugin/issues>.

## Not affiliated

AI Usage Timeline is an independent, unofficial tool. It is not affiliated with, endorsed by, or
sponsored by Anthropic (Claude) or OpenAI (Codex, ChatGPT). All trademarks belong to their
respective owners.
