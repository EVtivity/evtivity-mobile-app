// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { act, renderHook } from '@testing-library/react-native';
import { useFonts } from 'expo-font';
import { FONT_MAP, useAppFonts } from '@/lib/fonts';

jest.mock('expo-font', () => ({ useFonts: jest.fn() }));

const mockUseFonts = useFonts as jest.Mock;

describe('FONT_MAP', () => {
  it('registers every Inter weight the UI selects by name', () => {
    expect(Object.keys(FONT_MAP)).toEqual([
      'Inter_400Regular',
      'Inter_500Medium',
      'Inter_600SemiBold',
      'Inter_700Bold',
      'Inter_800ExtraBold',
      'Inter_900Black',
    ]);
  });
});

describe('useAppFonts', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('is ready once the font loads', () => {
    mockUseFonts.mockReturnValue([true]);
    const { result } = renderHook(() => useAppFonts());
    expect(result.current).toBe(true);
  });

  it('is ready after the safety timeout even if the font never loads', () => {
    mockUseFonts.mockReturnValue([false]);
    const { result } = renderHook(() => useAppFonts());
    expect(result.current).toBe(false);
    act(() => jest.advanceTimersByTime(4000));
    expect(result.current).toBe(true);
  });
});
