// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The custom attest native module has no JS fallback under jest; replace it with
// controllable stubs so attestation.ts can be exercised without a device.
jest.mock('./modules/evtivity-attest', () => ({
  __esModule: true,
  isAttestationSupported: jest.fn(() => false),
  generateKey: jest.fn(async () => 'key-id'),
  attestKey: jest.fn(async () => 'attestation-blob'),
  generateAssertion: jest.fn(async () => 'assertion-blob'),
  requestIntegrityToken: jest.fn(async () => 'integrity-token'),
}));
