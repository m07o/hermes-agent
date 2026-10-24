/** Shell preferences that are not per-server. */
import { type KeyValueStorage, readJSON, SETTINGS_KEY, writeJSON } from './storage';

export interface MobileSettings {
  /** Hold a screen-on flag while the app is open: a long agent turn otherwise
   * ends with the phone asleep and the WebSocket dropped. */
  keepAwake: boolean;
}

export const DEFAULT_SETTINGS: MobileSettings = { keepAwake: false };

export function parseSettings(raw: unknown): MobileSettings {
  const record = (raw ?? {}) as Record<string, unknown>;

  return { keepAwake: record.keepAwake === true };
}

export function loadSettings(storage: KeyValueStorage): MobileSettings {
  return readJSON(storage, SETTINGS_KEY, parseSettings, DEFAULT_SETTINGS);
}

export function saveSettings(storage: KeyValueStorage, settings: MobileSettings): void {
  writeJSON(storage, SETTINGS_KEY, settings);
}
