# Hermes Mobile (Android)

The Android companion app for a Hermes Agent installation. Point it at a
`hermes dashboard` running on your own machine — a VPS, a home server, a laptop —
and the phone becomes a remote control for that agent: the same chat, sessions,
skills, cron jobs and settings the desktop app shows, in your pocket.

The agent does **not** run on the phone. Your skills, memories, sessions and API
keys stay on the server, exactly as they are when you connect the desktop app to
a remote backend.

> Status: scaffold, not yet a shipped artifact. The TypeScript shell builds, is
> lint-clean and is unit-tested; the Android project is generated and customized
> but has never been compiled (that needs an Android SDK — see
> [Building](#building)). Read [`PLAN.md`](./PLAN.md) before extending it.

## What it is

A [Capacitor](https://capacitorjs.com) app whose bundled web assets are only a
small **shell**:

| Screen | Does |
| --- | --- |
| Servers | Lists every Hermes server this phone knows, with a live probe of each (`GET /api/status`): version, gateway state, whether sign-in is required. |
| Add / edit server | Validates and canonicalises the address, probes it *before* saving, and reports what answered. |
| Settings | Keep-screen-on, per-server sign-out, About, links to the docs. |

Opening a server hands the WebView to that server's origin. From there the user
is on the real Hermes dashboard — sign-in page included — served by their own
backend, with the dashboard's session cookie living in the app's private WebView
cookie jar.

Why navigate instead of iframing or bundling the SPA: the dashboard is
same-origin with its own `/api/*` and `/api/ws` by design, and its session
cookie is `SameSite=Lax`. Navigating keeps all of that true, so no CORS surface
has to be opened on the backend and no credential ever passes through the shell.

## What the native side adds

`android/app/src/main/java/com/nousresearch/hermes/mobile/`:

- **`MainActivity.java`** — back-button handling while a remote dashboard is on
  screen (the Capacitor bridge is not injected into remote origins, so no JS
  listener can run there): back walks the server's history, then returns to the
  shell, and only then leaves the app. Also routes downloads to the system and
  flushes cookies on pause so a sign-in survives Android reclaiming the process.
- **`HermesShellPlugin.java`** — the three things JavaScript cannot do: the
  keep-screen-on window flag, per-origin sign-out (HttpOnly cookies), and the
  package version.
- **`res/xml/network_security_config.xml`** — TLS-only in release builds;
  cleartext allowed only for on-device addresses (a Termux gateway on
  `127.0.0.1`, the emulator's `10.0.2.2`). `app/src/debug/AndroidManifest.xml`
  additionally permits `http://` on the LAN for debug builds, which is how most
  people first point a phone at a home server.

## Building

The web shell needs only Node; the APK needs an Android SDK and a JDK.

```bash
npm run install:mobile          # from the repo root
cd apps/mobile

npm run dev                     # shell in a browser on http://127.0.0.1:5177
npm run check                   # typecheck + unit tests + lint
npm run cap:sync                # build the shell and copy it into android/

npm run android:apk             # needs ANDROID_HOME + JDK 21 → android/app/build/outputs/apk/debug/
npm run cap:open                # or open the project in Android Studio
```

Getting an installable build (debug APK from CI, signed release APK/AAB from a
tag, or a local Android Studio build) is documented in
[`RELEASE.md`](./RELEASE.md). The two build workflows are staged rather than
active — GitHub only runs workflows from `.github/workflows/`, and this
branch's push token has no `workflows` permission:

```bash
git mv apps/mobile/ci/mobile-android.yml .github/workflows/mobile-android.yml
git mv apps/mobile/ci/mobile-release.yml .github/workflows/mobile-release.yml
```

Install on a phone with `adb install -r hermes-mobile-*.apk`, or by opening the
file on the device. The debug build is signed with the debug keystore and is
not Play-Store distributable; release signing is opt-in via
`scripts/make-keystore.sh`.

## Pointing it at a server

On the machine that runs Hermes:

```bash
# a non-loopback bind engages the auth gate: it refuses to start without a provider
hermes dashboard --host 0.0.0.0
```

Then in the app: **Add a Hermes server** → `your-host:9119` → **Check** → save →
**Open** → sign in on the server's own login page.

Reachability matters more than credentials here. From a phone on cellular, a
homelab address needs a public hostname, a VPN (Tailscale/WireGuard), or an SSH
tunnel; `http://192.168.x.x:9119` only works on the same LAN, and only on a
debug build.

## Running the agent on the phone instead

That is a different path — the Termux package, which ships the CLI/TUI and can
run the gateway on-device. See
[Android / Termux](https://hermes-agent.nousresearch.com/docs/getting-started/termux).
This app deliberately does not embed Python or an agent runtime.
