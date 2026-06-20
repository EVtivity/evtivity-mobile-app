// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { API_BASE_URL } from './config';
import { deviceHeaders } from './device';
import { getAttestationHeaders } from './attestation';
import { getAccessToken, isAccessTokenStale, refreshSession, hasSession } from './session';

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API error ${String(status)}`);
    this.name = 'ApiError';
  }

  get code(): string | undefined {
    if (this.body != null && typeof this.body === 'object') {
      const c = (this.body as Record<string, unknown>).code;
      if (typeof c === 'string') return c;
    }
    return undefined;
  }

  get serverMessage(): string | undefined {
    if (this.body != null && typeof this.body === 'object') {
      const e = (this.body as Record<string, unknown>).error;
      if (typeof e === 'string') return e;
    }
    return undefined;
  }

  get isServerDown(): boolean {
    return [0, 500, 502, 503, 504].includes(this.status);
  }
}

// Maps any thrown error to a user-facing message: the server's message for an
// ApiError, otherwise the generic offline copy. `t` is the i18next translator.
export function apiErrorMessage(err: unknown, t: (key: string) => string): string {
  if (err instanceof ApiError) {
    // A network failure or 5xx means the server is unreachable: show the
    // friendly offline copy, not the raw "Network request failed".
    if (err.isServerDown) return t('common.offline');
    return err.serverMessage ?? t('common.somethingWrong');
  }
  return t('common.offline');
}

// Field-level validation errors (VALIDATION_ERROR responses carry a details map)
// so forms can show the server message next to the offending input.
export function getApiErrorFieldDetails(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError)) return {};
  const body = err.body;
  if (body == null || typeof body !== 'object') return {};
  const details = (body as Record<string, unknown>).details;
  if (details == null || typeof details !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(details as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  // Endpoints under /v1/portal/auth that are reachable without a session.
  auth?: boolean;
  // Pre-auth endpoints (login, register, forgot-password) attach a device
  // attestation token in place of reCAPTCHA when the device supports it.
  attest?: boolean;
  signal?: AbortSignal;
}

async function baseHeaders(includeAuth: boolean): Promise<Record<string, string>> {
  // No Content-Type here: it is set per-request only when a body is sent. A
  // DELETE/GET with `Content-Type: application/json` but no body makes Fastify
  // reject the request with "body cannot be empty".
  const headers = await deviceHeaders();
  if (includeAuth) {
    const token = getAccessToken();
    if (token != null) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const method = opts.method ?? 'GET';
  const needsAuth = opts.auth !== false;

  // Proactively refresh a stale access token before the call rather than
  // eating a guaranteed 401 round-trip.
  if (needsAuth && hasSession() && isAccessTokenStale()) {
    await refreshSession();
  }

  // Produce the attestation token once before sending. Pre-auth endpoints do
  // not retry, so this never runs twice.
  const attestHeaders = opts.attest === true ? await getAttestationHeaders() : undefined;

  const send = async (): Promise<Response> => {
    const headers = await baseHeaders(needsAuth);
    if (attestHeaders != null) Object.assign(headers, attestHeaders);
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    return fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
      ...(opts.signal ? { signal: opts.signal } : {}),
    });
  };

  let res: Response;
  try {
    res = await send();
  } catch {
    throw new ApiError(0, { error: 'Network request failed', code: 'NETWORK_ERROR' });
  }

  // One reactive refresh-and-retry on 401 for authenticated calls.
  if (res.status === 401 && needsAuth && hasSession()) {
    const refreshed = await refreshSession();
    if (refreshed) {
      try {
        res = await send();
      } catch {
        throw new ApiError(0, { error: 'Network request failed', code: 'NETWORK_ERROR' });
      }
    }
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text.length > 0 ? safeJson(text) : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, data);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal): Promise<T> =>
    signal ? request<T>(path, { signal }) : request<T>(path),
  // Fetch a list endpoint shaped `{ data: T[] }` and return just the rows.
  getData: <T>(path: string, signal?: AbortSignal): Promise<T[]> =>
    api.get<{ data: T[] }>(path, signal).then((r) => r.data),
  post: <T>(
    path: string,
    body?: unknown,
    opts?: { auth?: boolean; attest?: boolean },
  ): Promise<T> =>
    request<T>(path, {
      method: 'POST',
      body,
      ...(opts?.auth === false ? { auth: false } : {}),
      ...(opts?.attest === true ? { attest: true } : {}),
    }),
  patch: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown): Promise<T> => request<T>(path, { method: 'PUT', body }),
  del: <T>(path: string, body?: unknown): Promise<T> =>
    request<T>(path, { method: 'DELETE', body }),
};
