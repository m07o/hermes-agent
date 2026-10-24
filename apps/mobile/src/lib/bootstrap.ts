/**
 * Native startup: the things that must happen once, before the first screen paints.
 *
 * All of it is guarded by `isNative()` so `npm run dev` in a browser is a plain
 * Vite app, and every call is best-effort — a missing plugin (e.g. an older
 * bundled native build) must not stop the shell from rendering.
 */
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

import { isNative } from './connect';
import { HermesShell } from './native';
import { loadSettings } from './settings';
import type { KeyValueStorage } from './storage';

export async function bootstrapNative(storage: KeyValueStorage): Promise<void> {
  if (!isNative()) {
    return;
  }

  const keepAwake = loadSettings(storage).keepAwake;

  await Promise.allSettled([
    StatusBar.setStyle({ style: Style.Dark }),
    StatusBar.setBackgroundColor({ color: '#0b0b0d' }),
    HermesShell.setKeepAwake({ enabled: keepAwake }),
    SplashScreen.hide()
  ]);
}
