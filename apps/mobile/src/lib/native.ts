/**
 * The shell's own native plugin (`android/app/src/main/java/.../HermesShellPlugin.kt`).
 *
 * Only what a WebView cannot do for itself: a screen-on flag, per-origin sign-out
 * (the dashboard's session cookies live in the WebView cookie jar, not in JS),
 * and the package version for the About row. Every call is guarded by
 * `isNative()` so `npm run dev` in a browser stays usable.
 */
import { registerPlugin } from '@capacitor/core';

export interface HermesAppInfo {
  build: string;
  platform: string;
  version: string;
}

export interface HermesShellPlugin {
  appInfo(): Promise<HermesAppInfo>;
  clearSiteData(options: { origin: string }): Promise<{ cleared: boolean }>;
  setKeepAwake(options: { enabled: boolean }): Promise<{ enabled: boolean }>;
}

export const HermesShell = registerPlugin<HermesShellPlugin>('HermesShell');
