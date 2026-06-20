// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The registry pulls in icon components; stub them so the test stays pure.
jest.mock('@/components/icons', () => ({
  CreditCard: 'icon',
  Nfc: 'icon',
  Car: 'icon',
  LifeBuoy: 'icon',
  QrCode: 'icon',
}));

import {
  sanitizeHomeCards,
  DEFAULT_HOME_CARDS,
  MIN_HOME_CARDS,
  MAX_HOME_CARDS,
  ALL_HOME_CARD_IDS,
  HOME_CARDS,
} from '@/lib/home-cards';

describe('sanitizeHomeCards', () => {
  it('returns defaults for non-array input', () => {
    expect(sanitizeHomeCards(undefined)).toEqual(DEFAULT_HOME_CARDS);
    expect(sanitizeHomeCards(null)).toEqual(DEFAULT_HOME_CARDS);
    expect(sanitizeHomeCards('scanQr')).toEqual(DEFAULT_HOME_CARDS);
    expect(sanitizeHomeCards({})).toEqual(DEFAULT_HOME_CARDS);
  });

  it('drops unknown ids', () => {
    expect(sanitizeHomeCards(['scanQr', 'bogus', 'vehicles'])).toEqual(['scanQr', 'vehicles']);
  });

  it('dedupes while preserving order', () => {
    expect(sanitizeHomeCards(['vehicles', 'scanQr', 'vehicles'])).toEqual(['vehicles', 'scanQr']);
  });

  it('falls back to defaults when fewer than the minimum remain', () => {
    expect(sanitizeHomeCards(['scanQr'])).toEqual(DEFAULT_HOME_CARDS);
    expect(sanitizeHomeCards([])).toEqual(DEFAULT_HOME_CARDS);
    expect(sanitizeHomeCards(['bogus', 'nope'])).toEqual(DEFAULT_HOME_CARDS);
  });

  it('clamps to the maximum', () => {
    const all = sanitizeHomeCards(['scanQr', 'paymentMethods', 'rfid', 'vehicles', 'support']);
    expect(all).toHaveLength(MAX_HOME_CARDS);
    expect(all).toEqual(['scanQr', 'paymentMethods', 'rfid', 'vehicles']);
  });

  it('passes valid 2 to 4 selections through unchanged', () => {
    expect(sanitizeHomeCards(['support', 'scanQr'])).toEqual(['support', 'scanQr']);
    expect(sanitizeHomeCards(['rfid', 'vehicles', 'support'])).toEqual([
      'rfid',
      'vehicles',
      'support',
    ]);
  });
});

describe('home card defaults', () => {
  it('puts Scan QR Code first and leaves Support off', () => {
    expect(DEFAULT_HOME_CARDS[0]).toBe('scanQr');
    expect(DEFAULT_HOME_CARDS).not.toContain('support');
    expect(DEFAULT_HOME_CARDS).toHaveLength(4);
  });

  it('uses a minimum of 2 and a maximum of 4', () => {
    expect(MIN_HOME_CARDS).toBe(2);
    expect(MAX_HOME_CARDS).toBe(4);
  });

  it('defines every available card, and Scan QR Code opens the charge scanner', () => {
    for (const id of ALL_HOME_CARD_IDS) {
      expect(HOME_CARDS[id]).toBeDefined();
      expect(HOME_CARDS[id].id).toBe(id);
    }
    expect(HOME_CARDS.scanQr.to).toBe('/charge/scan');
  });
});
