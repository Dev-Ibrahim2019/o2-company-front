# Browser-Phone — vendored copy

This directory contains a locally-vendored copy of [Browser-Phone](https://github.com/InnovateAsterisk/Browser-Phone)
by InnovateAsterisk, a WebRTC SIP softphone for Asterisk.

**License: AGPL-3.0** (see `LICENSE` in this folder). This copy is served as a
standalone static app, embedded into RestoMaster only via `<iframe>` — it is
**not** bundled into the React app's build output, and does not share code,
dependencies, or a build pipeline with the rest of the repository. Only this
`public/call-phone/` directory is subject to Browser-Phone's AGPL terms.

## What was changed from upstream

- `index.html`:
  - Stylesheet/script `<link>`/`<script>` tags rewritten to load `lib/*` locally
    instead of the upstream CloudFront CDN (self-contained, no third-party
    runtime dependency for a business-critical phone widget).
  - Service worker registration commented out (was causing stale-cache risk
    while this integration is still under active development).
  - `web_hook_on_invite`, `web_hook_on_register`, `web_hook_on_registrationFailed`,
    `web_hook_on_unregistered`, `web_hook_on_message`, `web_hook_on_terminate`,
    `web_hook_on_transportError` — implemented to call `restomasterNotify(...)`,
    a `postMessage` bridge to the parent page (RestoMaster's React app). These
    are all documented upstream extension points — no core logic was touched.
  - `<script src="phone.js">` moved out of the static `<script>` tags; it is now
    loaded dynamically by `restomaster-bridge.js` only after SIP credentials are
    provisioned (or provisioning fails), so `window.phoneOptions` is always
    populated before `phone.js` reads it.
- `restomaster-bridge.js` — **new file, not part of upstream.** Fetches the
  logged-in agent's SIP credentials from `GET /api/call-center/sip-accounts/my-credentials`
  (using a token passed via the iframe's URL query string) and populates
  `window.phoneOptions` before loading `phone.js`. No real SIP server address,
  port, or credentials are hardcoded anywhere in this integration — all of it
  comes from the `sip_accounts` table, configured by an administrator via
  RestoMaster's "إعدادات SIP" page.
- `lib/jquery/jquery-ui-1.13.2.min.css` — downloaded from the same upstream CDN
  referenced by the original `index.html`; this one file was missing from the
  repo's own `lib/` folder (present locally in every other project this was
  checked against, likely an upstream packaging gap).
- `phone.min.js` / `phone.min.css` were removed (the unminified `phone.js` /
  `phone.css` are used instead, since they weren't modified here).
- `modules/`, `config/`, `Docker/`, `Screenshots/` (Asterisk PBX server-side
  config templates and container files) were **not** vendored — irrelevant to
  the browser client, and PBX configuration is handled separately.

Everything else (`phone.js`, `phone.css`, `phone.dark.css`, `phone.light.css`,
`lib/*` besides the one CSS file noted above, `icons/`, `avatars/`, `media/`,
`lang/`, `manifest.json`, `favicon.ico`) is unmodified from upstream.

Source: https://github.com/InnovateAsterisk/Browser-Phone (cloned at the commit
current as of 2026-08-29).
