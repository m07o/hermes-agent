# Hermes Mobile — architecture and roadmap

Working notes for anyone extending `apps/mobile/`. What is built, what it
deliberately does not do, and the concrete next steps with the backend facts
each one rests on.

## The premise: Hermes is already client/server

Nothing about an Android app required new backend surface. The agent core runs on
a host; clients attach to it. What exists today:

| Client | Transport | Where |
| --- | --- | --- |
| CLI / TUI | stdio JSON-RPC to an in-process gateway | `cli.py`, `ui-tui/`, `tui_gateway/` |
| Web dashboard | HTTP + WS, same origin | `web/`, `hermes_cli/web_routers/` |
| Desktop (Electron) | HTTP + WS to a local **or remote** dashboard | `apps/desktop/` |
| Messaging platforms | gateway adapters | `gateway/platforms/` |

Three backend facts make a phone a first-class client rather than a hack:

1. **Native-app OAuth is already implemented.** `hermes_cli/dashboard_auth/native_flow.py`
   is RFC 8252 (OAuth 2.0 for Native Apps) with PKCE S256, one-time codes
   (`_CODE_TTL_SECONDS = 120`), refresh rotation and per-IP caps, exposed as
   `/auth/native/authorize`, `/auth/native/token`, `/auth/native/refresh`
   (`hermes_cli/dashboard_auth/routes.py`). Desktop uses it from
   `apps/desktop/electron/native-oauth.ts`. `GET /api/status` advertises the
   capability in `auth_flows: ["cookie", "native_pkce"]`
   (`web_routers/status.py::_auth_gate_status`).
2. **The chat socket accepts a bearer token.** In gated mode `_ws_auth_reason()`
   (`hermes_cli/web_server_chat.py`) accepts `?token=` holding a *user session
   access token* — the same token the native flow mints — alongside the
   single-use `?ticket=` the SPA fetches. REST has the matching leg
   (`dashboard_auth/native_http.py::authenticate_native_http`).
3. **The RPC surface is contracted.** `apps/shared/src/gateway-contract.openrpc.json`
   is an OpenRPC 1.3.2 document with 254 methods (`session.create`,
   `prompt.submit`, `approval.respond`, `cron.manage`, `connectors.*`, …), and
   `@hermes/shared`'s `JsonRpcGatewayClient` is transport-agnostic TypeScript
   (injectable `socketFactory`, no DOM dependency) — it runs in React Native
   unchanged.

So a *native* mobile client is a supported shape of this system, not a
reimplementation of it. Phase 1 below does not take that route yet, and the
reason is worth recording.

## Why Phase 1 navigates a WebView instead

Four ways to put Hermes on a phone:

| Approach | Cost | Verdict |
| --- | --- | --- |
| **Navigate the WebView to the user's dashboard** | days | **Phase 1.** Full feature parity with the browser dashboard on day one: chat, sessions, config, skills, cron, connectors. No backend change, no CORS surface, no credential handling in the app. |
| Bundle the dashboard SPA locally + call a remote API | weeks | Blocked on real work in `web/`: `HERMES_BASE_PATH` is a same-origin *path* prefix only (`web/src/lib/api.ts`), and the SPA's session token is injected into `index.html` by the server. Needs an API-base override, bearer-token plumbing, and CORS on ~250 routes. |
| iframe the remote dashboard | — | Dead on arrival: the session cookie is `SameSite=Lax` (`dashboard_auth/cookies.py`), so a cross-site iframe never sends it. |
| Native client (React Native) against the gateway contract | weeks–months | **Phase 3.** The right end state for notifications, background reconnect and a phone-shaped chat UI. |

The WebView choice also inherits mobile work the dashboard already did: soft-keyboard
inset maths (`web/src/lib/keyboard-inset.ts`, NS-434), IME replacement handling for
the Ink input line (`web/src/lib/pty-mobile-input.ts`), touch scrolling in xterm
(`web/src/lib/terminal-touch-scroll.ts`), and `isMobileLike` layout branches in
`web/src/pages/ChatPage.tsx`. The chat tab is genuinely usable on a phone today.

What it costs, stated plainly:

- **The Capacitor bridge does not exist on a remote origin.** It is injected only
  into pages the local server serves. So while the user is inside their
  dashboard, no plugin call can run — back navigation, downloads and cookie
  persistence are handled natively in `MainActivity.java` for exactly that
  reason. Anything new that must work *while connected* belongs in Kotlin, not
  in the shell's TypeScript.
- **`server.allowNavigation: ['*']`.** A saved address is runtime data, and
  Capacitor's host mask is baked at build time. The shell is the only thing that
  picks a URL (`lib/server-url.ts` rejects everything but http/https and refuses
  embedded credentials), but a link clicked inside the dashboard stays in-app
  rather than opening the browser. Phase 2 replaces the wildcard with a per-server
  mask (needs either a small Capacitor-side hook or a runtime setter upstream).
- **No push notifications.** A WebSocket dies when Android dozes, and nothing
  wakes the app. This is the single biggest gap versus Telegram, which already
  delivers agent output to a phone today.

## Phase 1 — connector shell (this directory, now)

Done, and verified as far as a sandbox without an Android SDK can verify:

- `src/lib/` — address parsing/canonicalisation, `/api/status` parsing, the
  saved-server list, storage, probing. Pure functions, 28 unit tests, no DOM.
- `src/app/` + `src/App.tsx` — three screens (Servers, Add/Edit, Settings) and a
  probe hook that re-checks on open and on demand.
- `android/` — generated by `npx cap add android` (Capacitor 8.5.3, minSdk 24,
  targetSdk 36, Java 21), then customized: `MainActivity.java`,
  `HermesShellPlugin.java`, TLS-only `network_security_config.xml`, debug-only
  cleartext for LAN testing.
- CI: `ci/mobile-android.yml` builds a debug APK; `ci/mobile-release.yml`
  builds a signed APK + AAB on `mobile-v*` tags and publishes a GitHub Release.
  Both are staged, not active — GitHub only runs workflows from
  `.github/workflows/`, and this branch's push token has no `workflows`
  permission. `git mv` them there to turn them on.

**Not verified:** the Gradle build has never run here (no JDK/SDK in this
environment), and nothing has run on a device. First compile is expected to need
small fixes; the two custom Java files are the only non-template code.

Launcher/splash art is generated from the repo's own brand icon
(`apps/desktop/assets/icon-dark.png`) into the mipmap/drawable sets, with a
dark adaptive-icon background; `apps/mobile/assets/` holds the 1024² and
2732² sources for regeneration with `npx @capacitor/assets generate --android`.

## Phase 2 — behave like an app, not a browser tab

In rough priority order:

1. **Notifications for agent input.** The highest-value item, and it needs a
   native poller because the bridge is absent while connected: a foreground
   service (`FOREGROUND_SERVICE_DATA_SYNC`, `POST_NOTIFICATIONS` on API 33+)
   that polls the server for work needing a human and raises a notification with
   a deep link back into the WebView. Two candidate sources, both existing:
   the gateway RPC `approval.pending` / `approval.respond`, and the pairing
   queue (`web_routers/ops.py`). A small read-only REST endpoint
   (`GET /api/mobile/pending`) would beat polling RPC over a second socket; that
   is the one backend addition worth asking for.
2. **Per-server navigation mask** to replace `allowNavigation: ['*']`, plus
   external links opening in Custom Tabs (`@capacitor/browser` is already a
   dependency).
3. **Release signing + a distributable build**: keystore in CI secrets,
   `bundleRelease`, and an internal distribution channel (Play internal testing
   or a self-hosted AAB). Debug APKs are not updatable across machines.
   *Done in this repo:* opt-in signing (`keystore.properties` / env vars,
   `scripts/make-keystore.sh`), env-stamped versioning, and the tag-driven
   `mobile-release.yml` that attaches APK + AAB + SHA-256 to a GitHub Release.
   *Still open:* the distribution channel itself (Play internal testing vs
   self-hosted) and the first signed build once a keystore exists.
4. **Reconnect resilience**: the dashboard's own WS reconnection
   (`web/src/lib/events-reconnect.ts`) plus `@capacitor/network` to surface
   offline state, and a "reconnect" affordance in the shell.
5. **Biometric gate on app open** — the phone is shared, a VPS is not.
6. **Tablet/foldable layout** and landscape, then an iOS build (the Capacitor
   project makes this mostly a Mac and an Apple Developer account).

## Phase 3 — native chat client

Replace the WebView for the chat surface only, keeping the shell:

- React Native/Expo app in this workspace, importing `@hermes/shared` directly
  (`JsonRpcGatewayClient`, `gateway-events`, the generated contract types) — no
  DOM dependency to work around.
- Auth via the RFC 8252 flow already on the server. One wrinkle:
  `_validate_loopback_redirect_uri()` accepts only `http://127.0.0.1:<port>/…`
  or `http://[::1]:<port>/…`, so either run a loopback listener on the device
  (RFC 8252 §7.3, works, but a browser shows a dead page for a moment) or add
  private-use scheme support (`hermes://oauth/callback`, RFC 8252 §7.1) —
  a small, well-scoped backend change in that one validator plus the redirect
  allowlist.
- Chat, sessions, approvals, clarify prompts and model switching come from the
  254-method contract; everything else (config, skills, cron, connectors) can
  stay a WebView page opened from the native shell. That hybrid keeps the
  surface that needs to feel native small.

## Phase 4 — desktop parity, honestly costed

"Like the app on my computer" has a specific meaning here, because the Electron
renderer is a bigger UI than the dashboard: multi-tab chat with workspaces,
subagent routing, Bot Mode, the plugin SDK, local terminal backends. Two ways to
close that gap:

1. **Bring the desktop renderer to the phone.** It is React + Vite already, but
   it talks to Electron main through one preload bridge, `window.hermesDesktop`
   (`apps/desktop/electron/preload.ts`, ~730 lines, 662 call sites in
   `apps/desktop/src`). Porting means implementing that bridge on Android —
   windows/tabs, PTY spawning, filesystem, backend process management — much of
   which has no phone analogue (there is no local backend to manage). Realistic
   only for a subset, and expensive per feature.
2. **Grow the dashboard's mobile layout** (Phase 2/3 direction): the phone gets
   the surfaces that matter there, and desktop-only features stay desktop-only.

Recommendation: (2). A phone is not a small desktop; the agent's value on a phone
is "see what it is doing, answer it, approve it" — which is chat + approvals +
notifications.

## Open questions

- Does Nous want a published mobile app (Play Store, signing identity, privacy
  policy, support surface), or a build-it-yourself connector? This changes
  Phase 2.3 from "nice" to "required".
- Should the mobile app be allowed to *start* a gateway (e.g. wake a hibernating
  Daytona/Modal backend)? The desktop can reach those; a phone plausibly should
  too, and the RPC surface for it already exists.
- Is a read-only `GET /api/mobile/pending` acceptable backend surface for
  notifications, or should Phase 2.1 poll existing endpoints instead?
