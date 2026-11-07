---
name: release
description: Bump the version, lint, sign the extension on Mozilla Add-ons (unlisted), fetch the signed .xpi, hand it off, and commit/push. Use when asked to sign, release, ship, publish a new version, or "get a new xpi".
---

# Release a signed build

The extension is distributed as an **unlisted** add-on on addons.mozilla.org (AMO): Mozilla signs it so it stays installed in Firefox / Zen, but it is not searchable in the store. Each release is a new version under the same add-on ID.

## Prerequisites

- `~/.amo-keys` exports `WEB_EXT_API_KEY` (JWT issuer, `user:…`) and `WEB_EXT_API_SECRET`. Keys come from https://addons.mozilla.org/developers/addon/api/key/.
  - If the file is missing, create it with placeholder values, `chmod 600` it, open it in the editor, and ask the person to paste their keys in. **Never ask for keys in chat and never print them.**
- Node / `npx` available (the script pulls `web-ext` pinned in `scripts/sign.sh`).

## Steps

1. **Bump `version` in `manifest.json`.** AMO rejects a version number it has already seen, even if that upload failed. Use patch bumps for fixes (`1.0.1` → `1.0.2`).
2. **Do not change `browser_specific_settings.gecko.id`.** That ID is the add-on's identity on AMO; changing it creates a brand new add-on and breaks updates for installed copies.
3. **Run the signing script** with an output dir *outside* the repo (scratchpad is ideal):
   ```sh
   scripts/sign.sh /path/to/scratchpad/signed
   ```
   It lints (fails on any error), removes the stale `.amo-upload-uuid`, signs on the unlisted channel, and downloads the signed file as `yt-windowed-<version>-signed.xpi`. Approval is automated and usually takes under a few minutes.
4. **Verify the XPI** before handing it off:
   ```sh
   unzip -l <out>/yt-windowed-<version>-signed.xpi
   ```
   It should contain only `manifest.json`, `content.js`, `content.css`, `options.*`, `icons/` and `META-INF/` (Mozilla's signature). No `scripts/`, `.claude/`, zips, or dotfiles.
5. **Hand off the file.** If the person is working on a remote machine, upload the `.xpi` to their Google Drive (Drive connector, `contentMimeType: application/x-xpinstall`, `disableConversionToGoogleType: true`) and give them the link. Check the uploaded `fileSize` matches the local file. Install: `about:addons` → ⚙️ → *Install Add-on From File…*.
6. **Commit and push** the version bump with the code changes.

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

## Privacy rules for this public repo

The repo is public and should not identify its owner. Commits use the GitHub no-reply address, never a personal email. Don't commit keys, `.env`, local paths, or anything personal. Grep before committing:
```sh
git grep -niE "gmail|@[a-z]+\.(com|net|org)|/home/|api_secret|user:[0-9]+"
```
