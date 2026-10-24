/**
 * Reading `GET /api/status`.
 *
 * That endpoint is deliberately public (it is the liveness probe Desktop and
 * the installer use), so the shell can show what a server is before the user
 * signs in. Everything here tolerates an unknown shape: an older gateway, a
 * reverse proxy returning its own error page, or a captive portal must all
 * degrade to "we could not read it", never to a crash.
 */

/** The subset of `/api/status` the shell renders. */
export interface GatewayStatus {
  activeSessions: number | null;
  authFlows: string[];
  authProviders: string[];
  authRequired: boolean;
  gatewayRunning: boolean;
  gatewayState: string | null;
  overall: string | null;
  profiles: string[];
  releaseDate: string | null;
  version: string | null;
}

/** What the shell can do with a server it just probed. */
export type ServerReadiness =
  /** Signed-in-or-loopback: opening it lands straight on the dashboard. */
  | 'ready'
  /** The auth gate is engaged; opening it lands on the dashboard's own sign-in. */
  | 'needs-signin'
  /** Reachable, but the gateway process behind the dashboard is not running. */
  | 'gateway-stopped'
  /** Reachable and reporting a degraded component. */
  | 'degraded';

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : null;
}

function names(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
}

/** True when the payload came from a Hermes dashboard rather than something else on that port. */
export function looksLikeHermesStatus(payload: unknown): boolean {
  if (payload === null || typeof payload !== 'object') {
    return false;
  }

  const record = payload as Record<string, unknown>;

  // `auth_required` is present on every gated and ungated build; `version` alone
  // would also match unrelated services that expose a version string.
  return 'auth_required' in record || ('version' in record && 'gateway_running' in record);
}

export function parseGatewayStatus(payload: unknown): GatewayStatus {
  const record = (payload ?? {}) as Record<string, unknown>;

  return {
    activeSessions: count(record.active_sessions),
    authFlows: names(record.auth_flows),
    authProviders: names(record.auth_providers),
    authRequired: bool(record.auth_required),
    gatewayRunning: bool(record.gateway_running),
    gatewayState: text(record.gateway_state),
    overall: text(record.overall),
    profiles: names(record.profiles),
    releaseDate: text(record.release_date),
    version: text(record.version)
  };
}

export function serverReadiness(status: GatewayStatus): ServerReadiness {
  if (!status.gatewayRunning) {
    return 'gateway-stopped';
  }

  if (status.overall === 'degraded') {
    return 'degraded';
  }

  return status.authRequired ? 'needs-signin' : 'ready';
}

/** One-line summary for a server card. */
export function statusSummary(status: GatewayStatus): string {
  const bits: string[] = [];

  if (status.version) {
    bits.push(`Hermes ${status.version}`);
  }

  if (status.activeSessions !== null && status.activeSessions > 0) {
    bits.push(`${status.activeSessions} active ${status.activeSessions === 1 ? 'session' : 'sessions'}`);
  }

  if (status.authRequired) {
    bits.push('sign-in required');
  } else {
    bits.push('no sign-in');
  }

  return bits.join(' · ');
}
