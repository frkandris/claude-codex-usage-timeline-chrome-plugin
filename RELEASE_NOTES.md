# Release notes

Newest first. One `## vX.Y.Z` section per released version — the release workflow uses the section
matching `manifest.json`'s version as the GitHub Release body.

## v1.0.1

- **Codex weekly limit is no longer labelled "5 hours"** — Codex windows are now classified by the
  length they declare (up to 24 hours = the 5-hour row, longer = the weekly row) instead of by their
  position in the API response. On plans whose only window is a weekly one, that window used to be
  displayed and charted as a 5-hour limit. Readings already collected are relabelled automatically.
- **Claude no longer reads 0% on multi-organization accounts** — an account can belong to several
  organizations (a personal one, one per team, an API-only one). Collection now tries each candidate
  and keeps the first that reports real usage, instead of betting on the first one it finds, which
  could return all zeroes or a 403.
- **Rows without data are hidden rather than shown as zero** — the Codex 5-hour row, its chart series
  and its toolbar-badge option now appear only when the plan actually exposes that window, matching
  how the weekly row already behaved.

## v1.0.0

- First release: 5–60 minute sampling of Claude and Codex usage limits, a shared timeline chart with
  trend forecasts, a toolbar badge, CSV export and 90-day local retention.
