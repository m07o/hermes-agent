import { describe, expect, it } from 'vitest';

import { memoryStorage, readJSON, writeJSON } from './storage';

describe('readJSON / writeJSON', () => {
  it('round-trips a value through the parse fn', () => {
    const storage = memoryStorage();

    writeJSON(storage, 'k', { a: 1 });
    expect(readJSON(storage, 'k', (raw) => raw, null)).toEqual({ a: 1 });
  });

  it('falls back when the key is missing or the JSON is corrupt', () => {
    const storage = memoryStorage({ broken: '{not json' });

    expect(readJSON(storage, 'missing', () => 'parsed', 'fallback')).toBe('fallback');
    expect(readJSON(storage, 'broken', () => 'parsed', 'fallback')).toBe('fallback');
  });

  it('swallows a throwing store instead of taking the shell down', () => {
    const throwing = {
      get: () => {
        throw new Error('blocked');
      },
      set: () => {
        throw new Error('quota');
      },
      remove: () => {
        throw new Error('blocked');
      }
    };

    expect(() => writeJSON(throwing, 'k', [1])).not.toThrow();
    expect(readJSON(throwing, 'k', () => 1, 0)).toBe(0);
  });
});
