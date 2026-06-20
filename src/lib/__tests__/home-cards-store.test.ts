// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

jest.mock('@/components/icons', () => ({
  CreditCard: 'icon',
  Nfc: 'icon',
  Car: 'icon',
  LifeBuoy: 'icon',
  QrCode: 'icon',
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(async () => undefined) },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHomeCards } from '@/lib/home-cards-store';
import { DEFAULT_HOME_CARDS } from '@/lib/home-cards';

const storage = AsyncStorage as unknown as { getItem: jest.Mock; setItem: jest.Mock };

beforeEach(() => {
  storage.getItem.mockReset();
  storage.setItem.mockReset();
  storage.setItem.mockResolvedValue(undefined);
  useHomeCards.setState({ cards: DEFAULT_HOME_CARDS, loaded: false });
});

describe('useHomeCards store', () => {
  it('load() uses defaults when nothing is stored', async () => {
    storage.getItem.mockResolvedValue(null);
    await useHomeCards.getState().load();
    expect(useHomeCards.getState().cards).toEqual(DEFAULT_HOME_CARDS);
    expect(useHomeCards.getState().loaded).toBe(true);
  });

  it('load() reads and sanitizes a stored selection', async () => {
    storage.getItem.mockResolvedValue(JSON.stringify(['support', 'scanQr', 'bogus']));
    await useHomeCards.getState().load();
    expect(useHomeCards.getState().cards).toEqual(['support', 'scanQr']);
  });

  it('load() falls back to defaults on corrupt JSON', async () => {
    storage.getItem.mockResolvedValue('{ not json');
    await useHomeCards.getState().load();
    expect(useHomeCards.getState().cards).toEqual(DEFAULT_HOME_CARDS);
    expect(useHomeCards.getState().loaded).toBe(true);
  });

  it('setCards persists and updates state', () => {
    useHomeCards.getState().setCards(['rfid', 'vehicles', 'support']);
    expect(useHomeCards.getState().cards).toEqual(['rfid', 'vehicles', 'support']);
    expect(storage.setItem).toHaveBeenCalledWith(
      'home.cards',
      JSON.stringify(['rfid', 'vehicles', 'support']),
    );
  });

  it('setCards sanitizes before persisting (clamps over the max)', () => {
    useHomeCards.getState().setCards(['scanQr', 'paymentMethods', 'rfid', 'vehicles', 'support']);
    expect(useHomeCards.getState().cards).toHaveLength(4);
    expect(storage.setItem).toHaveBeenCalledWith(
      'home.cards',
      JSON.stringify(['scanQr', 'paymentMethods', 'rfid', 'vehicles']),
    );
  });
});
