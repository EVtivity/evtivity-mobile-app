// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { requireOptionalNativeModule } from 'expo-modules-core';

// Native bridge for hardware device attestation. iOS uses Apple App Attest
// (DCAppAttestService); Android uses Google Play Integrity. The module is
// optional so JS does not crash in Expo Go or on a build without the native
// code: every helper degrades to "unsupported" and the caller sends no
// attestation header.
interface EvtivityAttestNativeModule {
  isSupported(): boolean;
  // iOS App Attest
  generateKey(): Promise<string>;
  attestKey(keyId: string, challenge: string): Promise<string>;
  generateAssertion(keyId: string, challenge: string): Promise<string>;
  // Android Play Integrity
  requestIntegrityToken(nonce: string, cloudProjectNumber: string | null): Promise<string>;
}

const native = requireOptionalNativeModule<EvtivityAttestNativeModule>('EvtivityAttest');

export function isAttestationSupported(): boolean {
  try {
    return native?.isSupported() ?? false;
  } catch {
    return false;
  }
}

export async function generateKey(): Promise<string> {
  if (native == null) throw new Error('attestation unavailable');
  return native.generateKey();
}

export async function attestKey(keyId: string, challenge: string): Promise<string> {
  if (native == null) throw new Error('attestation unavailable');
  return native.attestKey(keyId, challenge);
}

export async function generateAssertion(keyId: string, challenge: string): Promise<string> {
  if (native == null) throw new Error('attestation unavailable');
  return native.generateAssertion(keyId, challenge);
}

export async function requestIntegrityToken(
  nonce: string,
  cloudProjectNumber: string | null,
): Promise<string> {
  if (native == null) throw new Error('attestation unavailable');
  return native.requestIntegrityToken(nonce, cloudProjectNumber);
}
