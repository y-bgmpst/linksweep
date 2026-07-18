# LinkSweep

LinkSweep is a dependency-free Manifest V3 v0.0.2 MVP for a URL cleaner and
redirector extension.

## MVP Features

- Strips common tracking query parameters.
- Redirects configured domains to alternative frontends.
- Provides a popup preview before changing URLs.
- Learns unknown query parameters locally and suggests cleanup additions.
- Stores settings locally with `chrome.storage.local`.
- Uses dynamic `declarativeNetRequest` rules for main-frame cleanup and redirects.

## Try It

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Load this repository directory as an unpacked extension.
4. Open the extension popup and preview a URL.
5. Open the options page to enable or edit redirect rules.

## Test

```sh
node tests/rules.test.mjs
```

## Roadmap

See [ROADMAP.md](ROADMAP.md).

## Notes

The redirect examples are disabled by default. Enable only the alternatives you
trust. Tracking-parameter cleaning is intentionally explicit: unknown query
parameters are preserved.

## License

GPL-3.0-only. See [LICENSE](LICENSE).
