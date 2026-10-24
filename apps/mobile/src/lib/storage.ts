/**
 * Key/value persistence for the shell.
 *
 * The shell runs on the app's own bundled origin (`https://localhost` under
 * Capacitor's local server), so `localStorage` is private to this app and
 * survives updates — enough for a server list and two booleans. Secrets never
 * land here: sign-in happens on the Hermes server's own origin, and its session
 * cookies stay in the WebView cookie jar.
 */

export interface KeyValueStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export const SERVERS_KEY = 'hermes.mobile.servers.v1';
export const SETTINGS_KEY = 'hermes.mobile.settings.v1';

/** localStorage that never throws (private-mode WebViews, or a browser dev session). */
export const localKeyValueStorage: KeyValueStorage = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* a full or blocked store must not take the shell down */
    }
  },
  remove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
};

export function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const map = new Map(Object.entries(initial));

  return {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => void map.set(key, value),
    remove: (key) => void map.delete(key)
  };
}

/** Read + validate a JSON value, falling back to `fallback` on any problem. */
export function readJSON<T>(storage: KeyValueStorage, key: string, parse: (raw: unknown) => T, fallback: T): T {
  try {
    const raw = storage.get(key);

    if (raw === null) {
      return fallback;
    }

    return parse(JSON.parse(raw));
  } catch {
    return fallback;
  }
}

export function writeJSON(storage: KeyValueStorage, key: string, value: unknown): void {
  try {
    storage.set(key, JSON.stringify(value));
  } catch {
    /* unserialisable or store blocked — nothing worth crashing over */
  }
}
