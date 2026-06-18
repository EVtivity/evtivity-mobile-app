// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api } from './api';
import {
  loadSession,
  setSession,
  clearSession,
  hasSession,
  getRefreshToken,
  setOnLogout,
} from './session';
import { unregisterPushToken } from './push';
import type { AuthSuccess, Driver, LoginResult } from './types';
import { isMfaRequired } from './types';

const BIOMETRIC_PREF_KEY = 'ev_biometric_lock';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  driver: Driver | null;
  // True when a session exists but the app is waiting for a biometric unlock.
  locked: boolean;
  biometricEnabled: boolean;

  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => Promise<LoginResult>;
  verifyMfa: (mfaToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  setDriver: (driver: Driver) => void;
  unlock: () => void;
  setBiometricEnabled: (on: boolean) => Promise<void>;
}

async function applySession(success: AuthSuccess): Promise<void> {
  await setSession({
    token: success.token,
    refreshToken: success.refreshToken,
    expiresIn: success.expiresIn,
  });
}

export const useAuth = create<AuthState>((set, get) => ({
  status: 'loading',
  driver: null,
  locked: false,
  biometricEnabled: false,

  hydrate: async () => {
    setOnLogout(() => {
      set({ status: 'unauthenticated', driver: null, locked: false });
    });
    const restored = await loadSession();
    const biometricEnabled = (await SecureStore.getItemAsync(BIOMETRIC_PREF_KEY)) === '1';
    if (!restored) {
      set({ status: 'unauthenticated', driver: null, biometricEnabled });
      return;
    }
    try {
      const driver = await api.get<Driver>('/v1/portal/auth/me');
      set({
        status: 'authenticated',
        driver,
        biometricEnabled,
        locked: biometricEnabled,
      });
    } catch {
      await clearSession();
      set({ status: 'unauthenticated', driver: null, biometricEnabled });
    }
  },

  login: async (email, password) => {
    const result = await api.post<LoginResult>(
      '/v1/portal/auth/login',
      { email, password },
      { auth: false, attest: true },
    );
    if (isMfaRequired(result)) return result;
    await applySession(result);
    set({ status: 'authenticated', driver: result.driver, locked: false });
    return result;
  },

  register: async (input) => {
    const result = await api.post<LoginResult>('/v1/portal/auth/register', input, {
      auth: false,
      attest: true,
    });
    if (isMfaRequired(result)) return result;
    await applySession(result);
    set({ status: 'authenticated', driver: result.driver, locked: false });
    return result;
  },

  verifyMfa: async (mfaToken, code) => {
    const result = await api.post<AuthSuccess>(
      '/v1/portal/auth/mfa/verify',
      { mfaToken, code },
      { auth: false },
    );
    await applySession(result);
    set({ status: 'authenticated', driver: result.driver, locked: false });
  },

  logout: async () => {
    const refreshToken = getRefreshToken();
    try {
      await unregisterPushToken();
    } catch {
      // Best effort: a failed push unregister must not block logout.
    }
    if (hasSession()) {
      try {
        await api.post('/v1/portal/auth/logout', refreshToken != null ? { refreshToken } : {});
      } catch {
        // Logout is local-authoritative: clear regardless of the server result.
      }
    }
    await clearSession();
    set({ status: 'unauthenticated', driver: null, locked: false });
  },

  setDriver: (driver) => set({ driver }),

  unlock: () => set({ locked: false }),

  setBiometricEnabled: async (on) => {
    await SecureStore.setItemAsync(BIOMETRIC_PREF_KEY, on ? '1' : '0');
    set({ biometricEnabled: on });
  },
}));

export function useIsAuthenticated(): boolean {
  return useAuth((s) => s.status === 'authenticated');
}
