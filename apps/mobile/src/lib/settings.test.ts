import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS, loadSettings, parseSettings, saveSettings } from './settings';
import { memoryStorage, SETTINGS_KEY } from './storage';

describe('settings', () => {
  it('defaults to keep-awake off and round-trips a change', () => {
    const storage = memoryStorage();

    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);

    saveSettings(storage, { keepAwake: true });
    expect(loadSettings(storage)).toEqual({ keepAwake: true });
    expect(storage.get(SETTINGS_KEY)).toContain('keepAwake');
  });

  it('coerces an unknown persisted shape back to defaults', () => {
    expect(parseSettings('nonsense')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ keepAwake: 'yes' })).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
});
