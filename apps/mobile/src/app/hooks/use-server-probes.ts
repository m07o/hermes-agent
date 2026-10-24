/** Per-server probe state for the list screen. */
import { useCallback, useEffect, useRef, useState } from 'react';

import { type ProbeOutcome, probeServer } from '@/lib/probe';
import { parseServerUrl } from '@/lib/server-url';
import type { HermesServer } from '@/lib/servers';

export interface ProbeState {
  loading: boolean;
  outcome: ProbeOutcome | null;
  probedAt: number | null;
}

const UNKNOWN: ProbeState = { loading: false, outcome: null, probedAt: null };

function invalidAddress(): ProbeState {
  return {
    loading: false,
    outcome: { detail: 'This saved address is no longer valid — edit it or remove it.', kind: 'unreachable' },
    probedAt: Date.now()
  };
}

/**
 * Probe every saved server and keep the newest result per address.
 *
 * Probing is fire-and-forget: a server that never answers shows "unreachable"
 * instead of holding up the rest of the list. A `pass` counter drops results
 * that land after a newer refresh started, so the list never shows a stale
 * answer over a fresh one.
 */
export function useServerProbes(servers: readonly HermesServer[]) {
  const [probes, setProbes] = useState<Record<string, ProbeState>>({});
  const [refreshing, setRefreshing] = useState(false);
  const pass = useRef(0);

  const probeOne = useCallback(async (href: string, startedPass: number) => {
    let parts;

    try {
      parts = parseServerUrl(href);
    } catch {
      setProbes((current) => ({ ...current, [href]: invalidAddress() }));

      return;
    }

    const outcome = await probeServer(parts);

    setProbes((current) => {
      if (startedPass !== pass.current) {
        return current;
      }

      return { ...current, [href]: { loading: false, outcome, probedAt: Date.now() } };
    });
  }, []);

  const refreshAll = useCallback(async () => {
    pass.current += 1;
    const startedPass = pass.current;

    if (!servers.length) {
      setRefreshing(false);

      return;
    }

    setRefreshing(true);
    setProbes((current) =>
      Object.fromEntries(servers.map((server) => [server.href, { ...current[server.href], loading: true }] as const))
    );
    await Promise.allSettled(servers.map((server) => probeOne(server.href, startedPass)));

    if (startedPass === pass.current) {
      setRefreshing(false);
    }
  }, [probeOne, servers]);

  /** Re-check one server (the card's own button) without disturbing the others. */
  const refreshOne = useCallback(
    async (href: string) => {
      setProbes((current) => ({ ...current, [href]: { ...UNKNOWN, loading: true } }));
      await probeOne(href, pass.current);
    },
    [probeOne]
  );

  // Re-probe when the set of addresses changes (first paint, add, remove). The
  // dependency is the joined list, not the array identity, so an unrelated
  // rename or "last used" touch does not re-run every probe.
  const signature = servers.map((server) => server.href).join('|');
  const probedSignature = useRef<string | null>(null);

  useEffect(() => {
    if (probedSignature.current === signature) {
      return;
    }

    probedSignature.current = signature;
    void refreshAll();
  }, [refreshAll, signature]);

  return {
    probes,
    refreshAll,
    refreshOne,
    refreshing,
    probeState: (href: string): ProbeState => probes[href] ?? UNKNOWN
  };
}
