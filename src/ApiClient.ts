/**
 * Realm-agnostic, product-agnostic fetch wrapper.
 *
 * Takes `baseUrl` and `getAccessToken` as config — never hardcodes URLs and
 * never imports `@dloizides/auth-client`. Pairs with auth-client through the
 * `getAccessToken` callback, keeping the two packages composable rather than
 * coupled.
 *
 * The shape mirrors the stub the previous frontend-dev locked into the
 * package's contract, with a richer body that throws {@link ApiError} on
 * non-2xx responses, supports JSON-by-default request bodies, and merges
 * headers in a deterministic precedence order.
 */
import { extractErrorCode } from './utils/extractErrorCode';
import { extractErrorMessage } from './utils/extractErrorMessage';

import { ApiError } from './types/ApiError';

import type { ApiClientConfig } from './types/ApiClientConfig';

const DEFAULT_TIMEOUT_MS = 15000;
const NO_CONTENT_STATUS = 204;
const JSON_CONTENT_TYPE = 'application/json';
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const EMPTY_JSON_BODY = '{}';
const FALLBACK_REQUEST_FAILED = 'Request failed';

/** Per-request options accepted by {@link ApiClient.request} family. */
export interface ApiRequestOptions {
  /** Path appended to baseUrl. May start with `/` or not. */
  path: string;
  /** HTTP method. Defaults to `GET`. */
  method?: string;
  /** Optional JSON body (auto-stringified) or raw `BodyInit`. */
  body?: unknown;
  /** Per-request headers; merged on top of `defaultHeaders` and content-type. */
  headers?: Record<string, string>;
  /** Optional abort signal. */
  signal?: AbortSignal;
  /** Skip injecting the Authorization header for this call. */
  skipAuth?: boolean;
}

/**
 * Options for the convenience verbs (get/post/put/patch/delete).
 *
 * Each field has the same meaning as in {@link ApiRequestOptions} — but
 * `path`, `method`, and `body` are fixed by the verb itself, so this
 * subset omits them.
 */
export interface ApiVerbOptions {
  /** Per-request headers; merged on top of `defaultHeaders` and content-type. */
  headers?: Record<string, string>;
  /** Optional abort signal. */
  signal?: AbortSignal;
  /** Skip injecting the Authorization header for this call. */
  skipAuth?: boolean;
}

function isJsonBodyCandidate(body: unknown): boolean {
  if (body === undefined || body === null) {return false;}
  if (typeof body === 'string') {return false;}
  if (typeof FormData !== 'undefined' && body instanceof FormData) {return false;}
  if (typeof Blob !== 'undefined' && body instanceof Blob) {return false;}
  if (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer) {return false;}
  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) {return false;}
  return true;
}

function joinPath(baseUrl: string, path: string): string {
  const trimmed = baseUrl.replace(/\/$/, '');
  if (path === '') {return trimmed;}
  return path.startsWith('/') ? `${trimmed}${path}` : `${trimmed}/${path}`;
}

/**
 * Realm-agnostic API client. Throws {@link ApiError} on non-2xx responses.
 */
export class ApiClient {
  private readonly config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    if (typeof config.baseUrl !== 'string' || config.baseUrl === '') {
      throw new Error('ApiClient: baseUrl is required');
    }
    this.config = {
      timeoutMs: DEFAULT_TIMEOUT_MS,
      ...config,
    };
  }

  /** Returns the configured base URL with any trailing slash stripped. */
  get baseUrl(): string {
    return this.config.baseUrl.replace(/\/$/, '');
  }

  /** Returns the configured per-request timeout in milliseconds. */
  get timeoutMs(): number {
    return this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /** Generic request. Throws {@link ApiError} for non-2xx responses. */
  async request<T>(options: ApiRequestOptions): Promise<T> {
    const url = joinPath(this.baseUrl, options.path);
    const method = (options.method ?? 'GET').toUpperCase();
    const headers = await this.buildHeaders(options);
    const body = this.buildBody(options.body, method);

    const init: RequestInit = { method, headers, signal: options.signal };
    if (body !== undefined) {init.body = body;}

    const response = await fetch(url, init);
    if (!response.ok) {
      const envelope = await this.readErrorEnvelope(response);
      throw new ApiError(envelope);
    }
    if (response.status === NO_CONTENT_STATUS) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  /** Convenience GET. */
  get<T>(path: string, options?: ApiVerbOptions): Promise<T> {
    return this.request<T>({ ...(options ?? ({} as ApiVerbOptions)), path, method: 'GET' });
  }

  /** Convenience POST. */
  post<T>(
    path: string,
    body?: unknown,
    options?: ApiVerbOptions,
  ): Promise<T> {
    return this.request<T>({ ...(options ?? ({} as ApiVerbOptions)), path, method: 'POST', body });
  }

  /** Convenience PUT. */
  put<T>(
    path: string,
    body?: unknown,
    options?: ApiVerbOptions,
  ): Promise<T> {
    return this.request<T>({ ...(options ?? ({} as ApiVerbOptions)), path, method: 'PUT', body });
  }

  /** Convenience PATCH. */
  patch<T>(
    path: string,
    body?: unknown,
    options?: ApiVerbOptions,
  ): Promise<T> {
    return this.request<T>({ ...(options ?? ({} as ApiVerbOptions)), path, method: 'PATCH', body });
  }

  /** Convenience DELETE. */
  delete<T>(
    path: string,
    options?: ApiVerbOptions,
  ): Promise<T> {
    return this.request<T>({ ...(options ?? ({} as ApiVerbOptions)), path, method: 'DELETE' });
  }

  private buildBody(body: unknown, method: string): BodyInit | undefined {
    // A write that declares JSON must CARRY JSON. An empty body with a JSON content type is
    // rejected ("a non-empty request body is required"), which is the same 415/400 class one
    // step along. Matches @dloizides/bff-web-client's writeContentTypeGuard exactly.
    const isBodyless = body === undefined || body === null;
    let serialised: BodyInit | undefined;
    if (isBodyless) {
      serialised = WRITE_METHODS.has(method) ? EMPTY_JSON_BODY : undefined;
    } else {
      serialised = isJsonBodyCandidate(body) ? JSON.stringify(body) : (body as BodyInit);
    }
    return serialised;
  }

  private async buildHeaders(options: ApiRequestOptions): Promise<Record<string, string>> {
    const merged: Record<string, string> = {};
    // A write declares JSON even with NO body. Setting this only when a body is present is
    // the 415 trap: a body-less POST goes out with no content type and the server rejects it.
    // (The axios-based sibling @dloizides/bff-web-client has the same class of defect for a
    // different reason — axios actively STRIPS the header when data is undefined. See
    // writeContentTypeGuard.ts there.) Runtime-typed bodies (FormData/Blob/…) must NOT be
    // stamped: the runtime supplies multipart + boundary itself.
    const isWrite = WRITE_METHODS.has((options.method ?? 'GET').toUpperCase());
    const isRuntimeTyped = options.body !== undefined && options.body !== null && !isJsonBodyCandidate(options.body);
    if (isJsonBodyCandidate(options.body) || (isWrite && !isRuntimeTyped)) {
      merged['Content-Type'] = JSON_CONTENT_TYPE;
    }
    Object.assign(merged, this.config.defaultHeaders ?? {});

    if (options.skipAuth !== true && this.config.getAccessToken !== undefined) {
      const token = await this.config.getAccessToken();
      if (token !== null && token !== '') {
        merged.Authorization = `Bearer ${token}`;
      }
    }

    if (options.headers !== undefined) {
      Object.assign(merged, options.headers);
    }
    return merged;
  }

  private async readErrorEnvelope(
    response: Response,
  ): Promise<{ status: number; code?: string; message: string; details?: unknown }> {
    const status = response.status;
    let raw: unknown = undefined;
    try {
      raw = await response.json();
    } catch {
      // Body wasn't JSON or was empty; details stay undefined.
    }
    const code = extractErrorCode(raw);
    const message = extractErrorMessage(
      raw,
      `${FALLBACK_REQUEST_FAILED} with status ${status}`,
    );
    return { status, code, message, details: raw };
  }
}
