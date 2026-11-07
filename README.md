# YouTube Windowed

A Firefox / Zen extension that makes the YouTube player fill the whole browser window — like fullscreen, but without leaving the window — while still letting you scroll down to the comments.

## Features

- Toggle from a button in the player controls or with the **`** key (configurable). **Esc** exits.
- Scroll down to comments and related videos; the YouTube header fades back in once you scroll.
- Options (toolbar popup):
  - Auto-enable on every video
  - Allow / disable scrolling
  - Hide the scrollbar
  - Floating mini player while reading comments

## How it works

It switches YouTube into theater mode, then CSS stretches the theater container to `100vh` and hides the masthead over the video. No background script, no network requests — the only permission is `storage` for your settings.

## Install

**Temporary (for development):** open `about:debugging#/runtime/this-firefox` → *Load Temporary Add-on…* → pick `manifest.json`.

**Permanent:** build and sign it as an unlisted add-on with your own [AMO API keys](https://addons.mozilla.org/developers/addon/api/key/):

```sh
npx web-ext sign --channel=unlisted --api-key=$AMO_JWT_ISSUER --api-secret=$AMO_JWT_SECRET
```

Then open the resulting `.xpi` in Firefox / Zen.

## Development

```sh
npx web-ext lint
npx web-ext run      # launches a Firefox with the extension loaded
npx web-ext build    # zip in web-ext-artifacts/
```

## License

MIT
