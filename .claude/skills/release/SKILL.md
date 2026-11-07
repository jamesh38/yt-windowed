---
name: release
description: Bump the version, lint, submit the extension to Mozilla Add-ons (listed), fetch the signed .xpi, and commit/push. Use when asked to sign, release, ship, publish a new version, or "get a new xpi".
---

# Release a new version

The extension is **listed** on addons.mozilla.org (AMO) as "Windowed Fullscreen for YouTube":
https://addons.mozilla.org/firefox/addon/windowed-fullscreen-youtube/

Installs from that page auto-update through Firefox / Zen's normal add-on update check, so a release is just: bump the version, submit, wait for review. No file hand-off is needed. Versions 1.0.0 and 1.0.1 were unlisted (self-distributed, no auto-update); don't go back to unlisted unless asked.

## Prerequisites

- `~/.amo-keys` exports `WEB_EXT_API_KEY` (JWT issuer, `user:…`) and `WEB_EXT_API_SECRET`. Keys come from https://addons.mozilla.org/developers/addon/api/key/.
  - If the file is missing, create it with placeholder values, `chmod 600` it, open it in the editor, and ask the person to paste their keys in. **Never ask for keys in chat and never print them.**
- Node / `npx` available (the script pulls `web-ext` pinned in `scripts/sign.sh`).

## Steps

1. **Bump `version` in `manifest.json`.** AMO rejects a version number it has already seen, even if that upload failed. Use patch bumps for fixes (`1.0.1` → `1.0.2`).
2. **Do not change `browser_specific_settings.gecko.id`.** That ID is the add-on's identity on AMO; changing it creates a brand new add-on and breaks updates for installed copies.
3. **Update `amo-metadata.json`** only if the store summary/description should change (it's applied on listed submissions; `slug` max 30 chars).
4. **Run the signing script** in the background (listed review can outlast a 10-minute tool timeout) with an output dir *outside* the repo:
   ```sh
   scripts/sign.sh /path/to/scratchpad/signed          # listed (default)
   scripts/sign.sh /path/to/scratchpad/signed unlisted # private build, no auto-update
   ```
   It lints (fails on any error), removes the stale `.amo-upload-uuid`, submits, waits up to 15 min for approval, and downloads the signed file. Listed versions go through review: usually automated and quick, sometimes hours. While waiting, `scripts/amo.py status` shows `unreviewed`; signed is `public`. Once `public`, every install updates by itself within about a day.
5. **Verify the XPI** once signed:
   ```sh
   unzip -l <out>/yt-windowed-<version>-signed.xpi
   ```
   It should contain only `manifest.json`, `content.js`, `content.css`, `options.*`, `icons/` and `META-INF/` (Mozilla's signature). No `scripts/`, `.claude/`, `amo-metadata.json`, zips, or dotfiles.
6. **Hand off a file only if asked.** If the person wants the `.xpi` itself while working on a remote machine, upload it to their Google Drive (Drive connector, `contentMimeType: application/x-xpinstall`, `disableConversionToGoogleType: true`) and check the uploaded `fileSize` matches.
7. **Commit and push** the version bump with the code changes.

## Checking status / recovering

```sh
source ~/.amo-keys
scripts/amo.py status                     # every version, channel, signing status
scripts/amo.py download 1.0.1 /some/dir   # re-download a signed version
```

## Known pitfalls

- **"Unsupported file type" during signing** with an old `web-ext` (8.x): the upload may still have succeeded. Run `scripts/amo.py status` before retrying. Keep `web-ext` current (10.x+).
- **"This upload has already been submitted"**: stale `.amo-upload-uuid` in the repo root. `sign.sh` deletes it; it's also gitignored.
- **Build output inside the repo gets bundled into the upload.** Always use an artifacts dir outside the source tree.
- **`MISSING_DATA_COLLECTION_PERMISSIONS`**: AMO requires `gecko.data_collection_permissions` (`{"required": ["none"]}` here). That key needs `strict_min_version` ≥ 140 (desktop) and `gecko_android.strict_min_version` ≥ 142.
- Lint must skip `scripts/` and `.claude/` (`--ignore-files`), otherwise it flags the shell/Python helpers.
- **Store name** can't start with a third-party trademark ("YouTube …" is rejected); keep the "… for YouTube" form. AMO kept the first upload's name even after the manifest changed, so after a rename, PATCH `/api/v5/addons/addon/<id>/` with `{"name": {"en-US": "…"}}`.

## Privacy rules for this public repo

The repo is public and should not identify its owner. Commits use the GitHub no-reply address, never a personal email. Don't commit keys, `.env`, local paths, or anything personal. Grep before committing:
```sh
git grep -niE "gmail|@[a-z]+\.(com|net|org)|/home/|api_secret|user:[0-9]+"
```
