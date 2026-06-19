// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { isMfaRequired } from '@/lib/types';
import type { LoginResult } from '@/lib/types';

describe('isMfaRequired', () => {
  it('is true for an MFA challenge', () => {
    const r: LoginResult = { mfaRequired: true, mfaMethod: 'totp', mfaToken: 'tok' };
    expect(isMfaRequired(r)).toBe(true);
  });
  it('is false for an auth success', () => {
    const r: LoginResult = {
      driver: {
        id: '1',
        firstName: 'A',
        lastName: 'B',
        email: null,
        phone: null,
        language: 'en',
        timezone: 'UTC',
        themePreference: 'system',
        distanceUnit: 'mi',
        emailVerified: true,
      },
      token: 't',
      refreshToken: 'r',
      expiresIn: 900,
    };
    expect(isMfaRequired(r)).toBe(false);
  });
});
