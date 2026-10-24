import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

/** True inside the Android app; false in `vite dev` / a plain browser. */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Hand the WebView to a Hermes server.
 *
 * This is a real navigation, not an iframe: the dashboard's own origin then owns
 * its cookies, its `/api/ws` WebSocket and its service of the SPA, exactly as in
 * a browser. `capacitor.config.ts` allows navigation to any host because the
 * address is only known at runtime; the shell is the only thing that chooses it.
 */
export function openDashboard(href: string): void {
  window.location.assign(href);
}

/** Leave the app for a link that is not the Hermes server (docs, an OAuth IdP's help page). */
export async function openInSystemBrowser(url: string): Promise<void> {
  if (isNative()) {
    await Browser.open({ url, presentationStyle: 'popover' });

    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}
