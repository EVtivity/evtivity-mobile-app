// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import i18next from 'i18next';
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

  // The driver portal, sent with a refusal the app cannot resolve itself (a
  // change that needs a fresh factor proof, a sign-in only the portal can
  // finish). Only an http(s) URL counts.
  get portalUrl(): string | undefined {
    if (this.body == null || typeof this.body !== 'object') return undefined;
    const raw = (this.body as Record<string, unknown>).portalUrl;
    return typeof raw === 'string' ? (webUrl(raw) ?? undefined) : undefined;
  }

  // A coded 502/504 is a station failure from the API, not an unreachable server.
  get isServerDown(): boolean {
    if (this.status === 502 || this.status === 504) return this.code == null;
    return [0, 500, 503].includes(this.status);
  }
}

/** The URL when it is an absolute http(s) URL, else null. */
export function webUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
}

/**
 * A page of the driver portal: the portal base URL (a refusal's portalUrl or
 * the branding portalUrl) plus a portal route such as /account/security.
 * Null when the base is not an http(s) URL.
 */
export function portalPageUrl(base: string | null | undefined, path: string): string | null {
  const root = base != null ? webUrl(base) : null;
  if (root == null) return null;
  return `${root.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

// A VALIDATION_ERROR message written for people, not a schema validator dump
// ("body/phone Invalid", JSON, several lines).
const SCHEMA_MESSAGE_RE = /^(body|querystring|params|headers)[/.\s]/;
function isPlainMessage(message: string): boolean {
  const m = message.trim();
  return (
    m.length > 0 &&
    m.length <= 300 &&
    !m.includes('\n') &&
    !/[{}[\]]/.test(m) &&
    !SCHEMA_MESSAGE_RE.test(m)
  );
}

// The server writes its messages in English: only an English UI shows them.
function isEnglish(language: string | undefined): boolean {
  return language == null || language === '' || language.split('-')[0] === 'en';
}

/**
 * Why a refusal with a portalUrl sends the driver to the portal, in the app
 * language (the server's message is English): a sign-in only the portal can
 * finish, else the generic "this change is made in the driver portal". A
 * screen that knows the change passes its own reason instead.
 */
export function portalReasonMessage(err: ApiError, t: (key: string) => string): string {
  return t(
    err.code === 'MFA_ENROLLMENT_REQUIRED'
      ? 'account.portalMfaEnrollment'
      : 'account.portalGeneric',
  );
}

// Maps any thrown error to a user-facing message in the app language. A
// refusal with a portalUrl gives the localized portal reason. A
// VALIDATION_ERROR shows the server's plain sentence in an English UI only;
// otherwise "check the highlighted fields" when it names fields, else the
// translated "Validation error". Otherwise the translated errors.{code} entry,
// then the server's message, otherwise the generic offline copy.
export function apiErrorMessage(
  err: unknown,
  t: (key: string) => string,
  language: string | undefined = i18next.language,
): string {
  if (err instanceof ApiError) {
    if (err.portalUrl != null) return portalReasonMessage(err, t);
    if (err.code === 'VALIDATION_ERROR') {
      const message = err.serverMessage;
      if (message != null && isPlainMessage(message) && isEnglish(language)) {
        return message.trim();
      }
      if (Object.keys(getApiErrorFieldDetails(err)).length > 0) return t('common.checkFields');
    }
    if (err.code != null) {
      const key = `errors.${err.code}`;
      const translated = t(key);
      if (translated !== key) return translated;
    }
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

// Headers of an authenticated request made outside the JSON client (a file
// download), after the same proactive refresh of a stale access token.
export async function authorizedHeaders(): Promise<Record<string, string>> {
  if (hasSession() && isAccessTokenStale()) await refreshSession();
  return baseHeaders(true);
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
