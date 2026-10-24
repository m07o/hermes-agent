/**
 * Hermes server address parsing.
 *
 * The shell never navigates anywhere the user did not type, and it never
 * navigates to a non-http(s) URL: this module is the single gate. It also
 * normalises what the user typed (`hermes.example.com:9119/hermes/` and
 * `https://hermes.example.com:9119/hermes` are the same server) so the saved
 * list can de-duplicate on a canonical identity.
 */

/** A saved Hermes server address, normalised for display and navigation. */
export interface ServerUrlParts {
  /** Host as typed, without the port (`hermes.example.com`). */
  hostname: string;
  /** Host and port (`hermes.example.com:9119`). */
  host: string;
  /** Absolute address to load, path prefix included, no trailing slash. */
  href: string;
  /** `scheme://host[:port]` — the server's identity for cookie scope and de-duplication. */
  origin: string;
  /** Reverse-proxy mount prefix (`/hermes`), or `""` when served at the root. */
  pathPrefix: string;
  /** False for `http://` — a release build refuses those (Android cleartext policy). */
  secure: boolean;
  /** Label to suggest when the user does not name the server. */
  defaultLabel: string;
}

/** Raised for an address the shell refuses to save or load. */
export class ServerUrlError extends Error {}

const DEFAULT_PORTS: Record<string, string> = { http: '80', https: '443' };

/** Hosts Android treats as on-device: cleartext stays allowed for these in release builds. */
const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost', '10.0.2.2']);

export function isLoopbackHost(hostname: string): boolean {
  const bare = hostname.replace(/^\[|\]$/g, '').toLowerCase();

  return LOOPBACK_HOSTS.has(bare);
}

/**
 * Parse and canonicalise a Hermes server address typed by the user.
 *
 * A missing scheme defaults to `https://` — the only safe default for a
 * server reached over the internet, and the one the docs recommend. A trailing
 * slash and a URL fragment are dropped; a query string is kept (deep links like
 * `?profile=worker` are meaningful to the dashboard).
 */
export function parseServerUrl(raw: string): ServerUrlParts {
  const typed = raw.trim();

  if (!typed) {
    throw new ServerUrlError('Enter the address of your Hermes server.');
  }

  if (typed.startsWith('/')) {
    throw new ServerUrlError('Enter a full address, including https:// and the host.');
  }

  // "Has a scheme" means `scheme://`. Matching a bare `:` too would read the
  // port in `hermes.example.com:9119` as a scheme and reject the address.
  const withScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(typed) ? typed : `https://${typed}`;

  let url: URL;

  try {
    url = new URL(withScheme);
  } catch {
    throw new ServerUrlError('That does not look like a web address.');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new ServerUrlError('Hermes servers are reached over http:// or https:// only.');
  }

  if (!url.hostname) {
    throw new ServerUrlError('That address has no host in it.');
  }

  if (url.username || url.password) {
    // Credentials in a URL end up in logs and in the WebView history; the
    // dashboard has its own sign-in, so refuse rather than silently strip.
    throw new ServerUrlError('Remove the username/password from the address — you sign in inside the app.');
  }

  url.hash = '';
  url.pathname = url.pathname.replace(/\/+$/, '');

  const secure = url.protocol === 'https:';
  const defaultPort = DEFAULT_PORTS[url.protocol];
  const host = url.port && url.port !== defaultPort ? `${url.hostname}:${url.port}` : url.hostname;

  return {
    hostname: url.hostname,
    host,
    href: url.toString().replace(/\/$/, ''),
    origin: url.origin,
    pathPrefix: url.pathname,
    secure,
    defaultLabel: host
  };
}

/** The `/api/status` probe URL for a parsed server (honours a reverse-proxy prefix). */
export function statusUrl(parts: ServerUrlParts): string {
  return `${parts.href}/api/status`;
}
