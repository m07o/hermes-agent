import { describe, expect, it } from 'vitest';

import { isLoopbackHost, parseServerUrl, ServerUrlError, statusUrl } from './server-url';

describe('parseServerUrl', () => {
  it('defaults a bare host:port to https and keeps the port in the label', () => {
    const parts = parseServerUrl('hermes.example.com:9119');

    expect(parts.href).toBe('https://hermes.example.com:9119');
    expect(parts.origin).toBe('https://hermes.example.com:9119');
    expect(parts.host).toBe('hermes.example.com:9119');
    expect(parts.secure).toBe(true);
    expect(parts.defaultLabel).toBe('hermes.example.com:9119');
  });

  it('drops the default port from host and label', () => {
    const parts = parseServerUrl('https://hermes.example.com:443/');

    expect(parts.host).toBe('hermes.example.com');
    expect(parts.href).toBe('https://hermes.example.com');
    expect(parts.defaultLabel).toBe('hermes.example.com');
  });

  it('keeps a reverse-proxy prefix but strips its trailing slash', () => {
    const parts = parseServerUrl('https://mission-control.example.com/hermes/');

    expect(parts.pathPrefix).toBe('/hermes');
    expect(parts.href).toBe('https://mission-control.example.com/hermes');
    expect(statusUrl(parts)).toBe('https://mission-control.example.com/hermes/api/status');
  });

  it('keeps a query string and drops a fragment', () => {
    const parts = parseServerUrl('https://hermes.example.com/?profile=worker#chat');

    expect(parts.href).toBe('https://hermes.example.com/?profile=worker');
  });

  it('accepts a LAN address over http and reports it as insecure', () => {
    const parts = parseServerUrl('http://192.168.1.20:9119');

    expect(parts.secure).toBe(false);
    expect(parts.origin).toBe('http://192.168.1.20:9119');
    expect(isLoopbackHost(parts.hostname)).toBe(false);
  });

  it('recognises on-device loopback hosts (Termux / emulator)', () => {
    expect(isLoopbackHost('127.0.0.1')).toBe(true);
    expect(isLoopbackHost('localhost')).toBe(true);
    expect(isLoopbackHost('10.0.2.2')).toBe(true);
    expect(isLoopbackHost('hermes.example.com')).toBe(false);
  });

  it('rejects credentials, non-http schemes and empty input', () => {
    expect(() => parseServerUrl('https://user:pass@hermes.example.com')).toThrow(ServerUrlError);
    expect(() => parseServerUrl('ftp://hermes.example.com')).toThrow(ServerUrlError);
    expect(() => parseServerUrl('file:///etc/passwd')).toThrow(ServerUrlError);
    expect(() => parseServerUrl('   ')).toThrow(ServerUrlError);
    expect(() => parseServerUrl('/chat')).toThrow(ServerUrlError);
  });

  it('reports a human-readable reason for garbage input', () => {
    expect(() => parseServerUrl('not a url at all')).toThrow(/web address/i);
  });
});
