// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_HOME_CARDS, sanitizeHomeCards, type HomeCardId } from './home-cards';

// Device-local: the home-card selection is a per-device preference, not synced
// to the driver profile.
const STORAGE_KEY = 'home.cards';

interface HomeCardsState {
  cards: HomeCardId[];
  loaded: boolean;
  load: () => Promise<void>;
  setCards: (cards: HomeCardId[]) => void;
}

export const useHomeCards = create<HomeCardsState>((set) => ({
  cards: DEFAULT_HOME_CARDS,
  loaded: false,
  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      set({
        cards: raw != null ? sanitizeHomeCards(JSON.parse(raw)) : [...DEFAULT_HOME_CARDS],
        loaded: true,
      });
    } catch {
      set({ cards: [...DEFAULT_HOME_CARDS], loaded: true });
    }
  },
  setCards: (cards) => {
    const next = sanitizeHomeCards(cards);
    set({ cards: next });
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  },
}));
