# TidyURL Maid

TidyURL Maid is a dependency-free Manifest V3 prototype for a URL cleaner and
redirector extension.

## MVP Features

- Strips common tracking query parameters.
- Redirects configured domains to alternative frontends.
- Provides a popup preview before changing URLs.
- Stores settings locally with `chrome.storage.local`.
- Uses dynamic `declarativeNetRequest` rules for main-frame redirects.

## Try It

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Load `/home/rhax/url-cleaner-redirector` as an unpacked extension.
4. Open the extension popup and preview a URL.
5. Open the options page to enable or edit redirect rules.

## Test

```sh
node tests/rules.test.mjs
```

## Notes

The redirect examples are disabled by default. Enable only the alternatives you
trust. Tracking-parameter cleaning is intentionally explicit: unknown query
parameters are preserved.
