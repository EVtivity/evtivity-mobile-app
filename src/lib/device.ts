// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import * as SecureStore from 'expo-secure-store';

// A stable per-install identifier sent as X-Device-Id. The server binds each
// refresh token to this value so a token stolen from one device cannot be
// rotated from another. It is an opaque random string, not a hardware id, so it
// carries no privacy-sensitive device fingerprint.
const DEVICE_ID_KEY = 'ev_device_id';

let cached: string | null = null;

function randomId(): string {
  const bytes = new Uint8Array(16);
  // global.crypto is provided by Expo's runtime; fall back to Math.random only
  // if absent (the value is an opaque identifier, not a secret).
  const g = globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => void } };
  if (g.crypto?.getRandomValues) {
    g.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
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
  await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  cached = id;
  return id;
}
