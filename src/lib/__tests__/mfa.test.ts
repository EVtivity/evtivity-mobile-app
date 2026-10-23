// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { driverHoldsFactor, PORTAL_PERSONAL_PATH, PORTAL_SECURITY_PATH } from '../mfa';

describe('driverHoldsFactor', () => {
  it('is false before the status loads', () => {
    expect(driverHoldsFactor(undefined)).toBe(false);
    expect(driverHoldsFactor(null)).toBe(false);
  });

  it('is true with an MFA method', () => {
    expect(driverHoldsFactor({ mfaEnabled: true, factorProofKinds: ['totp'] })).toBe(true);
  });

  it('is true for a passkey without an MFA method', () => {
    expect(driverHoldsFactor({ mfaEnabled: false, factorProofKinds: ['passkey'] })).toBe(true);
  });

  it('is false when the password or SSO is the only proof', () => {
    expect(driverHoldsFactor({ mfaEnabled: false, factorProofKinds: ['password'] })).toBe(false);
    expect(driverHoldsFactor({ mfaEnabled: false, factorProofKinds: ['sso'] })).toBe(false);
    expect(driverHoldsFactor({ mfaEnabled: false, factorProofKinds: [] })).toBe(false);
  });

  it('follows mfaEnabled on a server without the proof kinds', () => {
    expect(driverHoldsFactor({ mfaEnabled: true })).toBe(true);
    expect(driverHoldsFactor({ mfaEnabled: false })).toBe(false);
  });

  it('names the portal routes', () => {
    expect(PORTAL_SECURITY_PATH).toBe('/account/security');
    expect(PORTAL_PERSONAL_PATH).toBe('/account/personal');
  });
});
