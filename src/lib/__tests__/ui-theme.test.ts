// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(async () => undefined) },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  activeUiTheme,
  applyDriverUiTheme,
  parseUiTheme,
  UI_THEMES,
  useUiTheme,
} from '@/lib/ui-theme';

const storage = AsyncStorage as unknown as { getItem: jest.Mock; setItem: jest.Mock };

beforeEach(() => {
  storage.getItem.mockReset();
  storage.setItem.mockReset();
  storage.setItem.mockResolvedValue(undefined);
  useUiTheme.setState({ theme: 'default', loaded: false });
});

describe('parseUiTheme', () => {
  it('keeps the three themes and reads anything else as Default', () => {
    expect(UI_THEMES).toEqual(['default', 'soft', 'high-contrast']);
    expect(parseUiTheme('soft')).toBe('soft');
    expect(parseUiTheme('high-contrast')).toBe('high-contrast');
    expect(parseUiTheme('neon')).toBe('default');
    expect(parseUiTheme(undefined)).toBe('default');
    expect(parseUiTheme(3)).toBe('default');
  });
});

describe('useUiTheme store', () => {
  it('loads the device copy and marks the store loaded', async () => {
    storage.getItem.mockResolvedValue('high-contrast');
    await useUiTheme.getState().load();
    expect(storage.getItem).toHaveBeenCalledWith('ui.theme');
    expect(useUiTheme.getState()).toMatchObject({ theme: 'high-contrast', loaded: true });
    expect(activeUiTheme()).toBe('high-contrast');
  });

  it('starts with Default when nothing is stored or the read fails', async () => {
    storage.getItem.mockResolvedValue(null);
    await useUiTheme.getState().load();
    expect(useUiTheme.getState()).toMatchObject({ theme: 'default', loaded: true });
    useUiTheme.setState({ theme: 'soft', loaded: false });
    storage.getItem.mockRejectedValue(new Error('storage down'));
    await useUiTheme.getState().load();
    expect(useUiTheme.getState()).toMatchObject({ theme: 'default', loaded: true });
  });

  it('stores a new theme on the device, and survives a failed write', async () => {
    useUiTheme.getState().setTheme('soft');
    expect(useUiTheme.getState().theme).toBe('soft');
    expect(storage.setItem).toHaveBeenCalledWith('ui.theme', 'soft');
    storage.setItem.mockRejectedValue(new Error('full'));
    useUiTheme.getState().setTheme('default');
    await Promise.resolve();
    expect(useUiTheme.getState().theme).toBe('default');
  });
});

describe('applyDriverUiTheme', () => {
  it('adopts the account theme', () => {
    applyDriverUiTheme('soft');
    expect(useUiTheme.getState().theme).toBe('soft');
    expect(storage.setItem).toHaveBeenCalledWith('ui.theme', 'soft');
  });

  it('writes nothing when the theme is already in use', () => {
    applyDriverUiTheme('default');
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('uses the account theme on the next launch while the server is down', async () => {
    const saved: Record<string, string> = {};
    storage.setItem.mockImplementation(async (key: string, value: string) => {
      saved[key] = value;
    });
    storage.getItem.mockImplementation(async (key: string) => saved[key] ?? null);
    applyDriverUiTheme('high-contrast');
    // Next launch: no profile reply, only the device copy.
    useUiTheme.setState({ theme: 'default', loaded: false });
    await useUiTheme.getState().load();
    expect(useUiTheme.getState()).toMatchObject({ theme: 'high-contrast', loaded: true });
  });

  it('keeps the device theme for an API without the field', () => {
    useUiTheme.setState({ theme: 'soft' });
    applyDriverUiTheme(undefined);
    applyDriverUiTheme(null);
    expect(useUiTheme.getState().theme).toBe('soft');
  });
});
