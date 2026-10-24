import { describe, expect, it } from 'vitest';

import {
  looksLikeHermesStatus,
  parseGatewayStatus,
  serverReadiness,
  statusSummary
} from './status';

const GATED = {
  active_sessions: 2,
  auth_flows: ['cookie', 'native_pkce'],
  auth_providers: ['nous', 'basic'],
  auth_required: true,
  gateway_running: true,
  gateway_state: 'running',
  overall: 'ok',
  profiles: ['default', 'worker'],
  release_date: '2026-10-01',
  version: '1.4.2'
};

describe('parseGatewayStatus', () => {
  it('reads the fields the shell renders', () => {
    const status = parseGatewayStatus(GATED);

    expect(status.version).toBe('1.4.2');
    expect(status.authRequired).toBe(true);
    expect(status.authProviders).toEqual(['nous', 'basic']);
    expect(status.authFlows).toContain('native_pkce');
    expect(status.profiles).toEqual(['default', 'worker']);
    expect(serverReadiness(status)).toBe('needs-signin');
  });

  it('tolerates a partial or empty payload', () => {
    const status = parseGatewayStatus({});

    expect(status.version).toBeNull();
    expect(status.authRequired).toBe(false);
    expect(status.authProviders).toEqual([]);
    expect(status.activeSessions).toBeNull();
    expect(serverReadiness(status)).toBe('gateway-stopped');
  });

  it('ignores junk in list fields', () => {
    const status = parseGatewayStatus({ auth_providers: ['nous', 7, null, ''], profiles: 'nope' });

    expect(status.authProviders).toEqual(['nous']);
    expect(status.profiles).toEqual([]);
  });

  it('reports a stopped gateway and a degraded one distinctly', () => {
    expect(serverReadiness(parseGatewayStatus({ ...GATED, gateway_running: false }))).toBe('gateway-stopped');
    expect(serverReadiness(parseGatewayStatus({ ...GATED, overall: 'degraded' }))).toBe('degraded');
    expect(serverReadiness(parseGatewayStatus({ ...GATED, auth_required: false }))).toBe('ready');
  });
});

describe('looksLikeHermesStatus', () => {
  it('accepts a Hermes payload and rejects an unrelated service', () => {
    expect(looksLikeHermesStatus(GATED)).toBe(true);
    expect(looksLikeHermesStatus({ version: '1.0', gateway_running: true })).toBe(true);
    expect(looksLikeHermesStatus({ version: 'nginx' })).toBe(false);
    expect(looksLikeHermesStatus('Hermes is not here')).toBe(false);
    expect(looksLikeHermesStatus(null)).toBe(false);
  });
});

describe('statusSummary', () => {
  it('names the version, live sessions and the auth gate', () => {
    expect(statusSummary(parseGatewayStatus(GATED))).toBe('Hermes 1.4.2 · 2 active sessions · sign-in required');
  });

  it('says so when a server needs no sign-in', () => {
    const summary = statusSummary(parseGatewayStatus({ ...GATED, auth_required: false, active_sessions: 0 }));

    expect(summary).toBe('Hermes 1.4.2 · no sign-in');
  });
});
