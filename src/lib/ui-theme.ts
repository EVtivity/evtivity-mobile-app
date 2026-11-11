// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// The driver's theme (the look of the app; the light or dark mode is separate).
// The same values as the CSMS (`drivers.ui_theme`): the account keeps the
// choice, and the device keeps a copy so the theme applies before the first
// screen renders.
export const UI_THEMES = ['default', 'soft', 'high-contrast'] as const;
export type UiTheme = (typeof UI_THEMES)[number];

export const DEFAULT_UI_THEME: UiTheme = 'default';

const STORAGE_KEY = 'ui.theme';

// A value that is no known theme (an older API without the field, a stored
// value of a later release) reads as Default.
export function parseUiTheme(value: unknown): UiTheme {
  return typeof value === 'string' && (UI_THEMES as readonly string[]).includes(value)
    ? (value as UiTheme)
    : DEFAULT_UI_THEME;
}

interface UiThemeState {
  theme: UiTheme;
  // True once the stored copy was read, so the splash stays up until then.
  loaded: boolean;
  load: () => Promise<void>;
  setTheme: (theme: UiTheme) => void;
}

export const useUiTheme = create<UiThemeState>((set) => ({
  theme: DEFAULT_UI_THEME,
  loaded: false,
  load: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      set({ theme: parseUiTheme(stored), loaded: true });
    } catch {
      // Fail-soft: Default until the account's theme loads.
      set({ theme: DEFAULT_UI_THEME, loaded: true });
    }
  },
  setTheme: (theme) => {
    set({ theme });
    void AsyncStorage.setItem(STORAGE_KEY, theme).catch(() => undefined);
  },
}));

// The active theme, for code outside React (hsl(), the shadow tiers).
export function activeUiTheme(): UiTheme {
  return useUiTheme.getState().theme;
}

// Adopts the theme of the signed-in account. A driver object without the field
// (an API before v0.1.51) keeps the device's choice.
export function applyDriverUiTheme(value: unknown): void {
  if (value == null) return;
  const theme = parseUiTheme(value);
  if (theme !== useUiTheme.getState().theme) useUiTheme.getState().setTheme(theme);
}
