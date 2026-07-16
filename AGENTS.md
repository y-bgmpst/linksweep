# AGENTS.md - URL Cleaner Redirector

## Goal

Build a small, auditable Manifest V3 browser extension that cleans tracking
parameters from URLs and redirects known domains to configured alternatives.
Keep it dependency-free until the prototype proves it needs a build step.

## Architecture

- `manifest.json` defines the extension, permissions, popup, options page, and
  background service worker.
- `src/rules.js` owns all URL cleaning and redirect logic. It must stay usable
  from both browser code and Node-based tests.
- `src/background.js` converts settings into dynamic `declarativeNetRequest`
  rules and keeps them synced with extension storage.
- `src/popup.*` provides the quick preview and on/off controls.
- `src/options.*` owns editable rule configuration.

## Security and Privacy

- Treat user-entered URLs, hostnames, and redirect templates as untrusted input.
- Do not collect browsing history, send telemetry, or call remote services.
- Avoid broad host permissions unless a feature genuinely requires them.
- Keep query stripping explicit and reviewable; never remove unknown parameters
  by default unless the user enables that mode.
- Prefer `declarativeNetRequest` over request interception because the browser
  can apply rules without exposing request contents to extension code.
- Never store secrets, cookies, auth headers, or full browsing logs.

## Webdev Rules

- Use plain HTML, CSS, and JavaScript for the MVP.
- Keep UI controls accessible with labels, keyboard focus states, and clear
  validation messages.
- Avoid decorative-heavy UI; this is a utility extension, so prioritize dense,
  readable controls.
- Keep rule examples realistic and testable.
- If a framework or bundler is introduced later, document why the extra build
  surface is worth it.

## Quality Gates

Run before declaring a change complete:

```sh
node tests/rules.test.mjs
```

Manual smoke test:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Load this directory as an unpacked extension.
4. Open the popup and preview a URL with tracking parameters.
5. Visit a configured redirect source and confirm it navigates to the target.
