import type { Client } from 'openapi-fetch';

import type { paths } from './schema';
import { session } from '../auth/session.svelte';
import { Priority, queued } from './queue.svelte';

interface Init {
  params?: {
    path?: Record<string, string | number>;
    query?: Record<string, string | number | boolean>;
  };
  body?: unknown;
}

/// openapi-fetch's typed surface on a few lines of fetch: the page uses
/// GET/POST/PUT/DELETE with path and query parameters and JSON bodies, and
/// the library's 6 KB runtime does not fit the firmware budget. Path
/// parameters are encoded the way openapi-fetch does (a folder path's `/`
/// becomes `%2F`). Adds the PrusaLink key and signs out when the printer
/// refuses it.
function method(name: string) {
  return async (path: string, init: Init = {}) => {
    const query = new URLSearchParams(
      Object.entries(init.params?.query ?? {}).map(([k, v]) => [k, String(v)]),
    ).toString();
    const url =
      path.replace(/\{(\w+)\}/g, (_, key: string) =>
        encodeURIComponent(String(init.params?.path?.[key] ?? '')),
      ) + (query && `?${query}`);
    const headers: Record<string, string> = {};
    if (session.key) headers['X-Api-Key'] = session.key;
    const body = init.body === undefined ? null : JSON.stringify(init.body);
    if (body) headers['Content-Type'] = 'application/json';
    // Changes are what a person just did; reads are polling and listings.
    // The body is read inside the turn: the printer is busy until it is sent.
    const { response, text } = await queued(
      async () => {
        const response = await fetch(url, { method: name, headers, body });
        return {
          response,
          text: response.status === 204 ? '' : await response.text(),
        };
      },
      name === 'GET' ? Priority.Normal : Priority.Action,
    );
    if (response.status === 401) session.signOut();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      data = undefined;
    }
    return response.ok ? { data, response } : { error: data ?? text, response };
  };
}

/// The one client the app talks to the printer through. Requests go to the
/// page's own origin: on a printer that is the printer, in development the
/// dev server answers or proxies (mock/vite-plugin.ts).
export const api = {
  GET: method('GET'),
  POST: method('POST'),
  PUT: method('PUT'),
  DELETE: method('DELETE'),
} as unknown as Pick<Client<paths>, 'GET' | 'POST' | 'PUT' | 'DELETE'>;

/// Asks the printer whether `key` is valid, without signing in.
export async function checkKey(
  key: string,
): Promise<'ok' | 'rejected' | 'unreachable'> {
  try {
    const res = await queued(
      () => fetch('/api/version', { headers: { 'X-Api-Key': key } }),
      Priority.Action,
    );
    if (res.ok) return 'ok';
    return res.status === 401 ? 'rejected' : 'unreachable';
  } catch {
    return 'unreachable';
  }
}
