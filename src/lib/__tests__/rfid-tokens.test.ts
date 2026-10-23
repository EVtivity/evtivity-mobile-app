// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { rfidTokenStatus } from '../rfid-tokens';

const NOW = Date.parse('2026-10-14T12:00:00Z');

describe('rfidTokenStatus', () => {
  it('is active for an active card without expiry', () => {
    expect(rfidTokenStatus({ isActive: true, expiresAt: null }, NOW)).toBe('active');
  });

  it('is active for an active card from an API without the new fields', () => {
    expect(rfidTokenStatus({ isActive: true }, NOW)).toBe('active');
  });

  it('is active before the expiry', () => {
    expect(rfidTokenStatus({ isActive: true, expiresAt: '2026-10-15T00:00:00Z' }, NOW)).toBe(
      'active',
    );
  });

  it('is expired at or after the expiry', () => {
    expect(rfidTokenStatus({ isActive: true, expiresAt: '2026-10-14T12:00:00Z' }, NOW)).toBe(
      'expired',
    );
    expect(rfidTokenStatus({ isActive: true, expiresAt: '2026-01-01T00:00:00Z' }, NOW)).toBe(
      'expired',
    );
  });

  it('is inactive for a card the driver deactivated', () => {
    expect(
      rfidTokenStatus(
        { isActive: false, blockedByOperator: false, expiresAt: '2026-01-01T00:00:00Z' },
        NOW,
      ),
    ).toBe('inactive');
  });

  it('compares the expiry with the current time by default', () => {
    expect(rfidTokenStatus({ isActive: true, expiresAt: '2000-01-01T00:00:00Z' })).toBe('expired');
    expect(rfidTokenStatus({ isActive: true, expiresAt: '2999-01-01T00:00:00Z' })).toBe('active');
  });

  it('is blocked for a card the operator deactivated, before expiry', () => {
    expect(
      rfidTokenStatus(
        { isActive: false, blockedByOperator: true, expiresAt: '2026-01-01T00:00:00Z' },
        NOW,
      ),
    ).toBe('blocked');
  });
});
