#!/usr/bin/env bash
# Lint, sign (unlisted) on AMO, and download the signed XPI for the current manifest version.
#
#   scripts/sign.sh [OUT_DIR]    # default OUT_DIR: ../yt-windowed-signed
#
# Needs ~/.amo-keys exporting WEB_EXT_API_KEY and WEB_EXT_API_SECRET.
set -euo pipefail

WEB_EXT="web-ext@10.8.0"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/../yt-windowed-signed}"
VERSION="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["version"])' "$ROOT/manifest.json")"

# shellcheck disable=SC1090
source "$HOME/.amo-keys"
cd "$ROOT"

echo "==> Linting $VERSION"
lint="$(npx -y "$WEB_EXT" lint --ignore-files scripts .claude 2>&1)"
echo "$lint" | grep -E "^(errors|notices|warnings)"
if ! echo "$lint" | grep -qE "^errors +0"; then
  echo "$lint"
  exit 1
fi

# A stale upload id makes AMO answer "This upload has already been submitted".
rm -f .amo-upload-uuid

echo "==> Signing $VERSION (unlisted)"
# Artifacts must live outside the source dir, or the old zip gets bundled into the upload.
npx -y "$WEB_EXT" sign --channel=unlisted --artifacts-dir="$OUT" \
  --ignore-files README.md LICENSE .gitignore scripts .claude \
  --approval-timeout=900000 2>&1 | grep -viE "secret" | grep -vE "^\s+at " || true

echo "==> Fetching signed XPI from AMO"
python3 "$ROOT/scripts/amo.py" status | grep -E "^$VERSION\b" || true
python3 "$ROOT/scripts/amo.py" download "$VERSION" "$OUT"
