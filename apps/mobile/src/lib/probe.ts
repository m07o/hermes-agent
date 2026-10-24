/**
 * Probing `GET /api/status` before the user commits to a server.
 *
 * Inside the app the request goes through CapacitorHttp, which performs it
 * natively — a cross-origin fetch from the shell's own origin would otherwise be
 * stopped by CORS, and the dashboard does not (and should not) send CORS headers
 * for an arbitrary app origin. In a browser dev session it falls back to fetch
 * and simply reports the failure.
 */
import { Capacitor, CapacitorHttp } from '@capacitor/core';

import { type ServerUrlParts, statusUrl } from './server-url';
import { type GatewayStatus, looksLikeHermesStatus, parseGatewayStatus, serverReadiness, type ServerReadiness } from './status';

export const PROBE_TIMEOUT_MS = 8_000;

export type ProbeOutcome =
  | { detail: string; kind: 'unreachable' }
  | { detail: string; httpStatus: number; kind: 'not-hermes' }
  | { httpStatus: number; kind: 'hermes'; readiness: ServerReadiness; status: GatewayStatus };

interface RawResponse {
  data: unknown;
  status: number;
}

function describeFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? 'unknown error');

  if (/timeout/i.test(message)) {
    return 'No answer in time — is the server running and reachable from this network?';
  }

  if (/unable to resolve host|unknownhost|name or service not known/i.test(message)) {
    return 'That hostname did not resolve. Check the spelling, or your DNS/VPN.';
  }

  if (/connect|refused|unreachable|econnrefused/i.test(message)) {
    return 'Nothing answered on that address and port.';
  }

  if (/ssl|certificate|handshake/i.test(message)) {
    return 'The TLS certificate was not trusted. Use a real certificate, or an http:// address on a debug build.';
  }

  return message;
}

async function request(url: string): Promise<RawResponse> {
  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.get({
      connectTimeout: PROBE_TIMEOUT_MS,
      headers: { accept: 'application/json' },
      readTimeout: PROBE_TIMEOUT_MS,
      url
    });

    return { data: response.data, status: response.status };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(url, { headers: { accept: 'application/json' }, signal: controller.signal });
    const text = await response.text();
    let data: unknown = text;

    try {
      data = JSON.parse(text);
    } catch {
      /* keep the text: a proxy error page is the useful detail */
    }

    return { data, status: response.status };
  } finally {
    clearTimeout(timer);
  }
}

/** Ask a server what it is. Never throws — every failure becomes an outcome. */
export async function probeServer(parts: ServerUrlParts): Promise<ProbeOutcome> {
  const url = statusUrl(parts);

  try {
    const { data, status } = await request(url);

    if (!looksLikeHermesStatus(data)) {
      const detail =
        typeof data === 'string' && data.trim()
          ? data.trim().slice(0, 200)
          : `That endpoint answered, but not like a Hermes dashboard (HTTP ${status}).`;

      return { detail, httpStatus: status, kind: 'not-hermes' };
    }

    const parsed = parseGatewayStatus(data);

    return { httpStatus: status, kind: 'hermes', readiness: serverReadiness(parsed), status: parsed };
  } catch (error) {
    return { detail: describeFailure(error), kind: 'unreachable' };
  }
}
