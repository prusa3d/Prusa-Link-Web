import { handleApi, type MockResponse } from '../mock/api.ts';
import { applyPatch, type MockPatch, snapshot } from '../mock/control.ts';
import type { MockPrinter } from '../mock/printer.ts';

/// Requests the dev server would answer from the mock printer.
export function isMockPath(pathname: string): boolean {
  return /^\/(api|thumb|usb)\//.test(pathname) || pathname === '/__mock/state';
}

type Headers = Record<string, string | undefined>;

/// What the dev server (mock/vite-plugin.ts) answers, without a server.
export function answer(
  printer: MockPrinter,
  method: string,
  pathname: string,
  headers: Headers,
  body: Uint8Array | undefined,
  query = '',
): MockResponse {
  if (pathname === '/__mock/state') {
    if (method === 'PATCH' && body?.length) {
      applyPatch(
        printer,
        JSON.parse(new TextDecoder().decode(body)) as MockPatch,
      );
    }
    return { status: 200, body: snapshot(printer) };
  }
  return handleApi(printer, {
    method,
    path: pathname,
    query,
    headers,
    ...(body && { body }),
  });
}

function bodyText(body: unknown): string | Uint8Array<ArrayBuffer> {
  if (body === undefined) return '';
  if (body instanceof Uint8Array) return new Uint8Array(body);
  return typeof body === 'string' ? body : JSON.stringify(body);
}

function toResponse(out: MockResponse): Response {
  const empty =
    out.body === undefined || [101, 204, 205, 304].includes(out.status);
  let type = 'application/json';
  if (typeof out.body === 'string') type = 'text/plain';
  else if (out.body instanceof Uint8Array) type = 'application/octet-stream';
  return new Response(empty ? null : bodyText(out.body), {
    status: out.status,
    headers: {
      'content-type': type,
      ...out.headers,
    },
  });
}

const lowerCase = (headers: HeadersInit | undefined): Headers =>
  Object.fromEntries(
    [...new Headers(headers).entries()].map(([k, v]) => [k.toLowerCase(), v]),
  );

async function bytesOf(body: unknown): Promise<Uint8Array | undefined> {
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'string') return new TextEncoder().encode(body);
  if (body instanceof Blob) return new Uint8Array(await body.arrayBuffer());
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  if (ArrayBuffer.isView(body))
    return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
  return undefined;
}

/// A printer on Wi-Fi does not answer at once.
const LATENCY_MS = 40;
/// Upload speed the progress bar shows, in bytes per second.
const UPLOAD_SPEED = 2 * 1024 * 1024;

/// Answers the app's fetch and XMLHttpRequest calls to the printer from
/// `printer`, in the page; every other request goes out as usual.
export function installMockTransport(printer: MockPrinter) {
  const realFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.origin !== location.origin || !isMockPath(url.pathname))
      return realFetch(input, init);
    const body = await bytesOf(
      request.body ? await request.arrayBuffer() : undefined,
    );
    const out = answer(
      printer,
      request.method,
      url.pathname,
      lowerCase(request.headers),
      body,
      url.search.slice(1),
    );
    await delay(LATENCY_MS + (out.delayMs ?? 0), request.signal);
    return toResponse(out);
  };

  globalThis.XMLHttpRequest = mockXhr(printer);
}

function delay(ms: number, signal?: AbortSignal | null) {
  return new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

/// An XMLHttpRequest that answers mock paths itself, reporting upload
/// progress at UPLOAD_SPEED, and hands every other request to the real one.
/// Covers what src/lib/api/upload.ts uses.
function mockXhr(printer: MockPrinter) {
  const Real = globalThis.XMLHttpRequest;

  class MockXhr extends EventTarget {
    readonly upload = new EventTarget() as XMLHttpRequestUpload;
    status = 0;
    readyState = 0;
    responseText = '';
    onload: ((e: ProgressEvent) => void) | null = null;
    onerror: ((e: ProgressEvent) => void) | null = null;
    onabort: ((e: ProgressEvent) => void) | null = null;
    #method = 'GET';
    #url = new URL(location.href);
    #headers: Headers = {};
    #aborted = false;
    #real: XMLHttpRequest | undefined;

    open(method: string, url: string | URL) {
      this.#method = method.toUpperCase();
      this.#url = new URL(url, location.href);
      this.readyState = 1;
    }

    setRequestHeader(name: string, value: string) {
      this.#headers[name.toLowerCase()] = value;
    }

    getResponseHeader(): string | null {
      return null;
    }

    abort() {
      this.#aborted = true;
      this.#real?.abort();
    }

    send(body?: Document | XMLHttpRequestBodyInit | null) {
      if (
        this.#url.origin !== location.origin ||
        !isMockPath(this.#url.pathname)
      ) {
        this.#sendReal(body);
        return;
      }
      void this.#sendMock(body);
    }

    #sendReal(body?: Document | XMLHttpRequestBodyInit | null) {
      const real = new Real();
      this.#real = real;
      real.open(this.#method, this.#url);
      for (const [k, v] of Object.entries(this.#headers))
        if (v !== undefined) real.setRequestHeader(k, v);
      real.upload.onprogress = (e) => {
        this.upload.onprogress?.call(this as unknown as XMLHttpRequest, e);
      };
      const done = (kind: 'load' | 'error' | 'abort') => (e: ProgressEvent) => {
        this.status = real.status;
        this.readyState = 4;
        this.responseText = real.responseText;
        this.#emit(kind, e);
      };
      real.onload = done('load');
      real.onerror = done('error');
      real.onabort = done('abort');
      real.send(body);
    }

    async #sendMock(body?: Document | XMLHttpRequestBodyInit | null) {
      const bytes = await bytesOf(body);
      const total = bytes?.length ?? 0;
      const started = performance.now();
      const duration = Math.max(600, (total / UPLOAD_SPEED) * 1000);
      for (;;) {
        await delay(100);
        if (this.#aborted) {
          this.#emit('abort', new ProgressEvent('abort'));
          return;
        }
        const loaded = Math.min(
          total,
          Math.round(((performance.now() - started) / duration) * total),
        );
        const progress = new ProgressEvent('progress', {
          lengthComputable: total > 0,
          loaded,
          total,
        });
        this.upload.onprogress?.call(
          this as unknown as XMLHttpRequest,
          progress,
        );
        this.upload.dispatchEvent(progress);
        if (performance.now() - started >= duration) break;
      }
      const out = answer(
        printer,
        this.#method,
        this.#url.pathname,
        this.#headers,
        bytes,
      );
      this.status = out.status;
      this.readyState = 4;
      const text = bodyText(out.body);
      this.responseText =
        typeof text === 'string' ? text : new TextDecoder().decode(text);
      this.#emit('load', new ProgressEvent('load'));
    }

    #emit(kind: 'load' | 'error' | 'abort', e: ProgressEvent) {
      const handler = {
        load: this.onload,
        error: this.onerror,
        abort: this.onabort,
      }[kind];
      handler?.call(this as unknown as XMLHttpRequest, e);
      this.dispatchEvent(new ProgressEvent(kind));
    }
  }

  return MockXhr as unknown as typeof XMLHttpRequest;
}
