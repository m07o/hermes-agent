import { describe, expect, it } from 'vitest';

import { parseServerUrl } from './server-url';
import {
  parseServerList,
  removeServer,
  renameServer,
  type ServerList,
  sortServers,
  toServer,
  touchServer,
  upsertServer
} from './servers';

const vps = toServer(parseServerUrl('https://hermes.example.com:9119'), { now: 1_000 });
const home = toServer(parseServerUrl('http://192.168.1.20:9119'), { label: 'Home lab', now: 2_000 });

describe('toServer', () => {
  it('labels a server by its host unless the user names it', () => {
    expect(vps.label).toBe('hermes.example.com:9119');
    expect(home.label).toBe('Home lab');
    expect(vps.lastUsedAt).toBeNull();
  });
});

describe('upsertServer', () => {
  it('appends a new address and replaces a repeat, keeping history', () => {
    const once: ServerList = upsertServer([], vps);

    expect(once).toHaveLength(1);

    const renamed = toServer(parseServerUrl('https://hermes.example.com:9119/'), { label: 'VPS' });
    const twice = upsertServer(touchServer(once, vps.href, 5_000), renamed);

    expect(twice).toHaveLength(1);
    expect(twice[0].label).toBe('VPS');
    expect(twice[0].lastUsedAt).toBe(5_000);
    expect(twice[0].addedAt).toBe(1_000);
  });

  it('treats a reverse-proxy mount as a different server', () => {
    const list = upsertServer([vps], toServer(parseServerUrl('https://hermes.example.com:9119/hermes')));

    expect(list).toHaveLength(2);
  });
});

describe('list edits', () => {
  it('removes, renames and touches without mutating the input', () => {
    const list: ServerList = [vps, home];

    expect(removeServer(list, home.href)).toEqual([vps]);
    expect(list).toHaveLength(2);
    expect(renameServer(list, vps.href, '  VPS  ')[0].label).toBe('VPS');
    expect(renameServer(list, vps.href, '   ')[0].label).toBe(vps.label);
    expect(touchServer(list, home.href, 9_000)[1].lastUsedAt).toBe(9_000);
  });

  it('sorts by last opened, then by newest added', () => {
    const opened = touchServer([vps, home], vps.href, 7_000);

    expect(sortServers(opened).map((entry) => entry.label)).toEqual(['hermes.example.com:9119', 'Home lab']);
    // Neither opened: `home` was added later, so it floats to the top.
    expect(sortServers([vps, home]).map((entry) => entry.label)).toEqual(['Home lab', 'hermes.example.com:9119']);
  });
});

describe('parseServerList', () => {
  it('drops junk entries and re-validates stored addresses', () => {
    const parsed = parseServerList([
      { href: 'https://hermes.example.com:9119/', label: 'VPS', addedAt: 1, lastUsedAt: 2 },
      { href: 'ftp://nope' },
      { href: 42 },
      null,
      { href: 'https://hermes.example.com:9119', label: 'duplicate' }
    ]);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ href: 'https://hermes.example.com:9119', label: 'VPS', lastUsedAt: 2 });
  });

  it('refuses a stored credential URL that an older build might have saved', () => {
    expect(parseServerList([{ href: 'https://user:pass@hermes.example.com' }])).toEqual([]);
  });

  it('returns an empty list for anything that is not a list', () => {
    expect(parseServerList(undefined)).toEqual([]);
    expect(parseServerList({ href: 'https://hermes.example.com' })).toEqual([]);
  });
});
