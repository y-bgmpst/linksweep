# LinkSweep Roadmap

This roadmap keeps LinkSweep focused on a small, auditable Manifest V3
extension. The core rule is simple: protect users without silently breaking
websites.

## v0.0.1 - MVP

Status: released

- Clean known tracking query parameters.
- Preserve unknown query parameters by default.
- Support optional domain redirects through dynamic MV3 rules.
- Provide popup preview and manual sweep action.
- Provide options page for cleanup and redirect rules.
- Add CI, validation, and reproducible ZIP build.

## v0.0.2 - Learn Mode

Goal: discover suspicious query parameters locally and ask the user before
cleaning them.

- Observe query parameters on visited main-frame URLs.
- Store learned parameter stats locally in `chrome.storage.local`.
- Group suggestions by domain and global frequency.
- Mark known tracking parameters as recognized.
- Show suggested parameters in the options page.
- Let users add a suggestion to the global cleanup list.
- Let users dismiss noisy or legitimate parameters.
- Do not auto-remove unknown learned parameters.
- Add tests for learning, suggestion ranking, and dismissal behavior.

## v0.0.3 - Site Rules

Goal: reduce breakage by letting users scope cleanup rules.

- Add per-domain cleanup allowlist and blocklist.
- Support "clean globally" vs "clean only on this domain".
- Add quick actions from the popup for the current site.
- Show which rule changed a preview URL.
- Add import/export for settings JSON.

## v0.0.4 - Safer Redirects

Goal: make redirect behavior easier to inspect and trust.

- Add redirect preview before enabling a rule.
- Warn when a redirect target is not HTTPS.
- Detect likely redirect loops before saving.
- Add per-rule test URLs in the options page.
- Add tests for loop detection and redirect precedence.

## v0.1.0 - Usability Pass

Goal: make the extension comfortable for daily use.

- Add cleaned-count stats without telemetry.
- Add one-click reset to defaults.
- Improve empty states and validation messages.
- Add keyboard-friendly options editing.
- Document Chrome Web Store packaging steps.

## Non-Goals

- No remote telemetry.
- No cloud sync.
- No automatic removal of unknown parameters.
- No dependency-heavy frontend framework.
- No hidden network requests.

