// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './config';
import { deviceHeaders, SECURE_STORE_OPTS } from './device';

// Token lifecycle for the Bearer mobile session. Tokens live in the OS keychain
// (expo-secure-store), never AsyncStorage. This module owns the single-flight
// refresh and is the only place that touches the stored tokens. It deliberately
// does NOT import the API client or the auth store, so there is no import cycle:
// api.ts and auth.ts both depend on this, not the other way around.

const ACCESS_KEY = 'ev_access_token';
const REFRESH_KEY = 'ev_refresh_token';
const EXPIRES_KEY = 'ev_expires_at';
// Refresh slightly before expiry so an in-flight request never races the clock.
const REFRESH_SKEW_MS = 30_000;

interface SessionTokens {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

let accessToken: string | null = null;
let refreshToken: string | null = null;
let expiresAt = 0;
let onLogout: (() => void) | null = null;
let onRenew: (() => void) | null = null;

export function setOnLogout(cb: () => void): void {
  onLogout = cb;
}

// Runs after every successful renewal (auth.ts registers the push token again).
export function setOnRenew(cb: () => void): void {
  onRenew = cb;
}

// The server refused the refresh token (401 INVALID_REFRESH_TOKEN,
// ACCOUNT_DISABLED, MFA_ENROLLMENT_REQUIRED, or another client error): the
// session is over. 408, 429 and 5xx (503 MFA_POLICY_UNAVAILABLE keeps the
// refresh token for the next try) are transient and keep it.
function isRefusal(status: number): boolean {
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
}

export async function loadSession(): Promise<boolean> {
  const [a, r, e] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
    SecureStore.getItemAsync(EXPIRES_KEY),
  ]);
  accessToken = a;
  refreshToken = r;
  expiresAt = e != null ? Number(e) : 0;
  return refreshToken != null;
}

export async function setSession(s: SessionTokens): Promise<void> {
  accessToken = s.token;
  refreshToken = s.refreshToken;
  expiresAt = Date.now() + s.expiresIn * 1000;
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, s.token, SECURE_STORE_OPTS),
    SecureStore.setItemAsync(REFRESH_KEY, s.refreshToken, SECURE_STORE_OPTS),
    SecureStore.setItemAsync(EXPIRES_KEY, String(expiresAt), SECURE_STORE_OPTS),
  ]);
}

export async function clearSession(): Promise<void> {
  accessToken = null;
  refreshToken = null;
  expiresAt = 0;
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
    SecureStore.deleteItemAsync(EXPIRES_KEY),
  ]);
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  return refreshToken;
}

export function hasSession(): boolean {
  return refreshToken != null;
}

export function isAccessTokenStale(): boolean {
  return accessToken == null || Date.now() >= expiresAt - REFRESH_SKEW_MS;
}

let refreshing: Promise<boolean> | null = null;

// Single-flight refresh: concurrent callers share one network round-trip. Uses
// a raw fetch (not the API client) so a 401 during refresh cannot recurse.
export function refreshSession(): Promise<boolean> {
  if (refreshing != null) return refreshing;
  refreshing = doRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function doRefresh(): Promise<boolean> {
  const current = refreshToken;
  if (current == null) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/v1/portal/auth/refresh`, {
      method: 'POST',
      headers: { ...(await deviceHeaders()), 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: current }),
    });
    if (!res.ok) {
      if (isRefusal(res.status)) await forceLogout();
      return false;
    }
    const data = (await res.json()) as SessionTokens;
    await setSession(data);
    onRenew?.();
    return true;
  } catch {
    // Network error: keep the session, the caller surfaces the failure. Only an
    // explicit rejection from the server invalidates the refresh token.
    return false;
  }
}

async function forceLogout(): Promise<void> {
  await clearSession();
  onLogout?.();
}
