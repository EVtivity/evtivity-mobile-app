// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  isAttestationSupported,
  generateKey,
  attestKey,
  generateAssertion,
  requestIntegrityToken,
} from '../../modules/evtivity-attest';
import { API_BASE_URL } from './config';
import { deviceHeaders } from './device';

// Mobile device attestation. On the pre-auth endpoints the app proves it is a
// genuine, unmodified build with Apple App Attest (iOS) or Google Play Integrity
// (Android) in place of the browser-only reCAPTCHA. Every failure path returns
// no header: the server decides whether attestation is required, so a device
// that cannot attest simply falls back to the server's rate limit when
// attestation is disabled, or is rejected with 403 when it is enabled.

const KEY_ID_STORE = 'ev_attest_key_id';

// Optional GCP project number for Play Integrity. Inlined by Metro. Classic
// requests work without it for Play-distributed apps; it is only needed when the
// app is sideloaded.
const ANDROID_CLOUD_PROJECT_NUMBER = process.env.EXPO_PUBLIC_GMS_PROJECT_NUMBER ?? null;

// A challenge is single-use, so registration and each assertion each fetch their
// own. Plain fetch (no attestation header) to avoid recursing through the gate.
async function fetchChallenge(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/portal/auth/attest/challenge`, {
      method: 'POST',
      headers: await deviceHeaders(),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { challenge?: unknown };
    return typeof data.challenge === 'string' ? data.challenge : null;
  } catch {
    return null;
  }
}

async function postRegister(body: {
  keyId: string;
  attestation: string;
  challenge: string;
}): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/portal/auth/attest/register`, {
      method: 'POST',
      headers: { ...(await deviceHeaders()), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Generate an App Attest key, attest it, register the public key server-side,
// and persist the key id. Returns the key id or null on any failure.
async function registerIos(): Promise<string | null> {
  try {
    const keyId = await generateKey();
    const challenge = await fetchChallenge();
    if (challenge == null) return null;
    const attestation = await attestKey(keyId, challenge);
    const ok = await postRegister({ keyId, attestation, challenge });
    if (!ok) return null;
    await SecureStore.setItemAsync(KEY_ID_STORE, keyId);
    return keyId;
  } catch {
    return null;
  }
}

async function iosAssertion(challenge: string): Promise<string | null> {
  let keyId = await SecureStore.getItemAsync(KEY_ID_STORE);
  if (keyId == null || keyId === '') {
    keyId = await registerIos();
    if (keyId == null) return null;
  }
  try {
    return await generateAssertion(keyId, challenge);
  } catch {
    // The stored key may be invalid after a reinstall or a server-side wipe.
    // Re-register once with a fresh key, then retry the assertion.
    const fresh = await registerIos();
    if (fresh == null) return null;
    try {
      return await generateAssertion(fresh, challenge);
    } catch {
      return null;
    }
  }
}

// Headers to attach to a pre-auth request (login, register, forgot-password).
// Returns {} whenever attestation cannot be produced.
export async function getAttestationHeaders(): Promise<Record<string, string>> {
  try {
    if (!isAttestationSupported()) return {};
    const challenge = await fetchChallenge();
    if (challenge == null) return {};

    if (Platform.OS === 'ios') {
      const assertion = await iosAssertion(challenge);
      if (assertion == null) return {};
      return {
        'X-Attest-Platform': 'ios',
        'X-Attest-Challenge': challenge,
        'X-Device-Attestation': assertion,
      };
    }

    if (Platform.OS === 'android') {
      const token = await requestIntegrityToken(challenge, ANDROID_CLOUD_PROJECT_NUMBER);
      return {
        'X-Attest-Platform': 'android',
        'X-Attest-Challenge': challenge,
        'X-Device-Attestation': token,
      };
    }

    return {};
  } catch {
    return {};
  }
}
