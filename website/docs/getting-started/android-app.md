---
sidebar_position: 3.5
title: "Android App"
description: "Run the Hermes dashboard on your phone: the Hermes Mobile Android app connects to the agent running on your own server"
---

# Hermes on Android: the mobile app

:::caution Developer preview — build it from source
`apps/mobile` is in the repository and its shell is tested, but there is no
published Play Store build yet. You build and install the APK yourself (below, or
let CI build one for you). Expect rough edges; the roadmap and the known gaps are
written down in [`apps/mobile/PLAN.md`](https://github.com/NousResearch/hermes-agent/blob/main/apps/mobile/PLAN.md).

Two things it is **not**: it does not run the agent on the phone (that is the
[Termux package](./termux.md)), and it does not replace
[Telegram](../user-guide/bot-mode.md), which already reaches your agent from a
phone with no app at all.
:::

Hermes Mobile is a connector. Your agent keeps running where it already runs — a
VPS, a home server, a laptop — and the phone becomes a remote control for it:
chat, sessions, skills, cron jobs and settings, the same surfaces the
[web dashboard](../user-guide/features/web-dashboard.md) and
[Hermes Desktop](../user-guide/desktop.md) show.

Your skills, memories, sessions and API keys never move to the phone. The app
stores the addresses you save and nothing else; sign-in happens on your server's
own login page and its session cookie stays in the app's private WebView storage.

## What you need first

1. **A reachable Hermes server.** The machine that runs your agent must be
   reachable from the phone — a public hostname, a VPN (Tailscale/WireGuard), an
   SSH tunnel, or the same LAN.
2. **A dashboard bound to a non-loopback address**, which engages the auth gate:

   ```bash
   hermes dashboard --host 0.0.0.0
   ```

   A non-loopback bind refuses to start until an auth provider is configured —
   [username/password](../user-guide/features/web-dashboard.md#usernamepassword-provider-no-oauth-idp)
   for a trusted network or VPN, [Nous Portal OAuth](../user-guide/features/web-dashboard.md#default-provider-nous-research)
   for anything internet-facing.

3. **Keep it running.** The dashboard is a foreground process; put it under
   `systemd`, `tmux`, or Docker so it survives logout. The
   [gateway](../user-guide/bot-mode.md) is separate — start it too if you rely on
   messaging channels.

Confirm from any machine before involving the phone:

```bash
curl -s http://YOUR_HOST:9119/api/status | jq '.version, .auth_required, .auth_providers'
```

That is the same probe the app runs when you press **Check**.

## Build and install

You need Node.js (see the repository's `.nvmrc`) plus, for the APK, an Android
SDK and JDK 21.

```bash
git clone https://github.com/NousResearch/hermes-agent.git
cd hermes-agent

npm run install:mobile
cd apps/mobile

npm run cap:sync          # build the shell, copy it into the Android project
npm run android:apk       # → android/app/build/outputs/apk/debug/app-debug.apk
```

Prefer not to install an Android SDK? The repository ships a workflow that builds
the same debug APK and uploads it as an artifact. It is staged at
`apps/mobile/ci/mobile-android.yml` — GitHub only runs workflows from
`.github/workflows/`, so a maintainer activates it with
`git mv apps/mobile/ci/mobile-android.yml .github/workflows/`. Once active it runs
on changes to `apps/mobile/` and on demand from the **Actions** tab.

Install it on the phone:

```bash
adb install -r app-debug.apk
```

Or copy the APK to the device and open it (allow "install unknown apps" for your
file manager). Debug builds are signed with the debug keystore, so they are not
Play-Store distributable and cannot be updated from someone else's build.

`npm run cap:open` opens the project in Android Studio instead, which is the
easier path if you want a device log while it runs.

## Connect

1. Open **Hermes** on the phone → **Add a Hermes server**.
2. Type the address — `hermes.example.com:9119`, or `http://192.168.1.20:9119` on
   your LAN. `https://` is assumed unless you type `http://`.
3. Press **Check**. The app reports what answered: the Hermes version, whether
   the gateway is running, and whether sign-in is required. A typo, a stopped
   gateway, or an untrusted TLS certificate is caught here rather than after the
   app has navigated away.
4. Save, then **Open**. You land on your dashboard's login page (if the gate is
   on), then on the dashboard itself. The **Chat** tab is the full TUI, with
   soft-keyboard handling and touch scrolling already wired for phones.

Android's back button walks back through the dashboard, then returns you to the
server list; it only leaves the app from there.

### Plain HTTP on a LAN

Release builds are TLS-only, with cleartext permitted just for on-device
addresses (`127.0.0.1`, `localhost`, and the emulator's `10.0.2.2`). The **debug**
build additionally allows `http://` to a LAN address, which is how most people
first point a phone at a home server — see
`apps/mobile/android/app/src/main/res/xml/network_security_config.xml`.

For anything beyond your own network, use HTTPS (a real certificate via a reverse
proxy, or Tailscale's HTTPS certificates) rather than widening that file.

## What works, and what does not yet

| Works | Notes |
| --- | --- |
| Chat (the embedded TUI) | Same PTY/xterm surface as the browser, including the mobile keyboard inset and touch scrolling |
| Sessions, status, analytics | The dashboard's own pages |
| Config, API keys, skills, MCP, cron, connectors | Everything the dashboard exposes |
| Sign-in (password or Nous OAuth) | On the server's own login page; the app never sees the credential |
| Multiple servers | Save a VPS and a home lab, switch by tapping |
| Keep screen on | Settings → prevents a long turn ending with the phone asleep |
| Sign out | Per server, or all of them; clears that origin's session cookies |

| Not yet | Tracked in |
| --- | --- |
| Push notifications (approvals, "agent is waiting") | `PLAN.md` Phase 2.1 |
| A branded launcher icon (it ships Capacitor's default) | `PLAN.md` Phase 1 debt |
| Release signing / a distributable build | `PLAN.md` Phase 2.3 |
| iOS | `PLAN.md` Phase 2.6 |
| A native chat UI (instead of the dashboard's) | `PLAN.md` Phase 3 |

## Troubleshooting

- **"Could not reach it"** — the phone cannot route to that address. On cellular,
  a `192.168.x.x` address will never work; use a hostname, a VPN, or an SSH
  tunnel. Check the same URL in the phone's browser to separate a network problem
  from an app problem.
- **"Something else answered"** — a reverse proxy or another service owns that
  port. Confirm `/api/status` returns JSON with `auth_required` in it.
- **Certificate error** — self-signed certificates are rejected in release builds.
  Use a trusted certificate, or a debug build for LAN testing.
- **Signed in again after a restart** — Android reclaimed the process before the
  cookie was flushed; the app flushes on pause, so update if you are on an older
  build. Otherwise the session TTL simply expired
  (`dashboard.basic_auth.session_ttl_seconds`, default 12h).
- **The chat tab is unusable at this size** — rotate to landscape; the terminal
  refits to the viewport. Phone-native chat is Phase 3 work.

## Related

- [Android / Termux](./termux.md) — run the agent itself on the device
- [Web Dashboard](../user-guide/features/web-dashboard.md) — the UI this app shows, including the auth gate
- [Bot Mode](../user-guide/bot-mode.md) — Telegram/Discord/Slack, the zero-install way to reach your agent from a phone
- [Hermes Desktop](../user-guide/desktop.md) — connecting a client to a remote backend
