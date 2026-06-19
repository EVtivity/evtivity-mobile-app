// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

// A stable per-install identifier sent as X-Device-Id. The server binds each
// refresh token to this value so a token stolen from one device cannot be
// rotated from another. It is an opaque random string, not a hardware id, so it
// carries no privacy-sensitive device fingerprint.
const DEVICE_ID_KEY = 'ev_device_id';

// Keep secrets readable only while the device is unlocked, and never restore
// them to a different device via an encrypted backup. Shared by every module
// that writes to SecureStore.
export const SECURE_STORE_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

let cached: string | null = null;

function randomId(): string {
  const bytes = Crypto.getRandomBytes(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function getDeviceId(): Promise<string> {
  if (cached != null) return cached;
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing != null && existing !== '') {
    cached = existing;
    return existing;
  }
  const id = randomId();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, id, SECURE_STORE_OPTS);
  cached = id;
  return id;
}

// The base headers every mobile request sends: a client tag and the device id.
// Callers add Authorization / Content-Type / attestation headers as needed.
export async function deviceHeaders(): Promise<Record<string, string>> {
  return {
    Accept: 'application/json',
    'X-Client': 'mobile',
    'X-Device-Id': await getDeviceId(),
  };
}
