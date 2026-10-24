/**
 * The saved-server list.
 *
 * Pure functions over an immutable list so the store can be unit-tested without
 * DOM or Capacitor, and so the persisted shape is validated on the way in: a
 * list written by an older build (or hand-edited) must never crash the shell.
 *
 * Identity is the canonical `href` — two entries pointing at the same address
 * and mount prefix are the same server, whatever label they carry.
 */
import { parseServerUrl, type ServerUrlParts } from './server-url';

export interface HermesServer {
  /** Canonical address (`https://host:9119/hermes`); also the entry's identity. */
  href: string;
  /** What the user calls it. */
  label: string;
  /** `scheme://host[:port]` — cookie scope, and what "sign out" clears. */
  origin: string;
  /** Reverse-proxy mount prefix, `""` at the root. */
  pathPrefix: string;
  secure: boolean;
  addedAt: number;
  lastUsedAt: number | null;
}

export type ServerList = readonly HermesServer[];

export function toServer(parts: ServerUrlParts, options: { label?: string; now?: number } = {}): HermesServer {
  const now = options.now ?? Date.now();
  const label = options.label?.trim();

  return {
    href: parts.href,
    label: label || parts.defaultLabel,
    origin: parts.origin,
    pathPrefix: parts.pathPrefix,
    secure: parts.secure,
    addedAt: now,
    lastUsedAt: null
  };
}

/** Add a server, or replace the entry that already points at that address. */
export function upsertServer(list: ServerList, server: HermesServer): ServerList {
  const existing = list.find((entry) => entry.href === server.href);

  if (!existing) {
    return [...list, server];
  }

  return list.map((entry) =>
    entry.href === server.href
      ? {
          ...entry,
          // A re-save keeps the original "when did I add this" and the last visit,
          // so re-typing an address does not reshuffle the list.
          label: server.label,
          pathPrefix: server.pathPrefix,
          secure: server.secure
        }
      : entry
  );
}

export function removeServer(list: ServerList, href: string): ServerList {
  return list.filter((entry) => entry.href !== href);
}

export function renameServer(list: ServerList, href: string, label: string): ServerList {
  const trimmed = label.trim();

  return list.map((entry) => (entry.href === href && trimmed ? { ...entry, label: trimmed } : entry));
}

export function touchServer(list: ServerList, href: string, now: number): ServerList {
  return list.map((entry) => (entry.href === href ? { ...entry, lastUsedAt: now } : entry));
}

/** Most recently opened first, then most recently added — the top card is the usual target. */
export function sortServers(list: ServerList): HermesServer[] {
  return [...list].sort((a, b) => {
    const aUsed = a.lastUsedAt ?? 0;
    const bUsed = b.lastUsedAt ?? 0;

    if (aUsed !== bUsed) {
      return bUsed - aUsed;
    }

    return b.addedAt - a.addedAt;
  });
}

function parseEntry(raw: unknown): HermesServer | null {
  if (raw === null || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;

  if (typeof record.href !== 'string') {
    return null;
  }

  // Re-parse rather than trust the stored fields: an entry written before a fix
  // to the URL gate must not bypass it on load.
  let parts: ServerUrlParts;

  try {
    parts = parseServerUrl(record.href);
  } catch {
    return null;
  }

  const addedAt = typeof record.addedAt === 'number' && Number.isFinite(record.addedAt) ? record.addedAt : 0;

  const lastUsedAt =
    typeof record.lastUsedAt === 'number' && Number.isFinite(record.lastUsedAt) ? record.lastUsedAt : null;

  const label = typeof record.label === 'string' && record.label.trim() ? record.label.trim() : parts.defaultLabel;

  return { href: parts.href, label, origin: parts.origin, pathPrefix: parts.pathPrefix, secure: parts.secure, addedAt, lastUsedAt };
}

/** Validate a persisted list, dropping entries that no longer parse. */
export function parseServerList(raw: unknown): HermesServer[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const kept: HermesServer[] = [];

  for (const item of raw) {
    const entry = parseEntry(item);

    if (entry && !kept.some((existing) => existing.href === entry.href)) {
      kept.push(entry);
    }
  }

  return kept;
}
