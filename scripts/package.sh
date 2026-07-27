#!/usr/bin/env bash
# Build the Chrome Web Store upload zip from a clean subset of the repo.
# Usage: npm run package   ->   dist/ai-usage-timeline-<version>.zip
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

version="$(node -p "require('./manifest.json').version")"
out="dist/ai-usage-timeline-${version}.zip"

# Only what Chrome actually loads. Everything else — wiki/, test/, store/, docs/,
# scripts/, package.json, *.md — is repo furniture and must not ship.
contents=(manifest.json background.js lib dashboard settings icons)

for item in "${contents[@]}"; do
  [[ -e "$item" ]] || { echo "missing: $item" >&2; exit 1; }
done

# The icon source is for editing, not for shipping.
rm -rf dist "$out"
mkdir -p dist

zip -r -q -X "$out" "${contents[@]}" \
  -x '*/.DS_Store' '*.svg'

echo "$out"
unzip -l "$out"
