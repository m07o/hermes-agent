import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Hermes Mobile — Capacitor configuration.
 *
 * The app is a *connector*: its own bundled web assets are only the shell
 * (server picker, sign-in, settings). The Hermes dashboard itself is served by
 * the user's own `hermes dashboard` / gateway process, and the WebView
 * navigates to it directly so every request the SPA makes stays same-origin —
 * no CORS, no token plumbing, and the dashboard's own session cookies live in
 * the WebView cookie jar exactly as they do in a browser.
 *
 * `server.allowNavigation: ['*']` is what makes that navigation possible: a
 * saved server address is only known at runtime, and Capacitor's host mask is
 * baked into the bundle at build time. Navigation is still constrained in
 * practice — MainActivity only ever loads an address the user typed and saved,
 * and the shell refuses non-http(s) URLs (see src/lib/server-url.ts).
 */
const config: CapacitorConfig = {
  appId: 'com.nousresearch.hermes.mobile',
  appName: 'Hermes',
  webDir: 'dist',
  android: {
    // A Hermes server on plain http:// must never silently upgrade or mix
    // content; release builds block cleartext (see res/xml/network_security_config.xml).
    allowMixedContent: false
  },
  server: {
    androidScheme: 'https',
    allowNavigation: ['*']
  },
  plugins: {
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true
    },
    SplashScreen: {
      launchShowDuration: 500,
      backgroundColor: '#0b0b0d',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0b0b0d'
    }
  }
}

export default config
