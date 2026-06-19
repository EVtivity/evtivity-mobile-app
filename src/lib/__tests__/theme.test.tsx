// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useColorScheme } from 'nativewind';

const FULL_PALETTE = {
  background: '0 0% 100%',
  foreground: '222 47% 11%',
  card: '0 0% 100%',
  cardForeground: '222 47% 11%',
  elevated: '0 0% 98%',
  primary: '142 72% 33%',
  primaryForeground: '0 0% 100%',
  cta: '142 72% 33%',
  ctaForeground: '0 0% 100%',
  accent: '142 72% 33%',
  accentForeground: '0 0% 100%',
  muted: '210 40% 96%',
  mutedForeground: '215 16% 47%',
  border: '214 32% 91%',
  ring: '', // empty to exercise the transparent fallback
  success: '142 72% 33%',
  warning: '38 92% 50%',
  destructive: '0 84% 60%',
  info: '221 83% 53%',
};

jest.mock('nativewind', () => ({
  vars: (obj: Record<string, string>) => obj,
  useColorScheme: jest.fn(() => ({ colorScheme: 'light' })),
}));
jest.mock('@/lib/config', () => ({
  BRAND: { colors: { light: FULL_PALETTE, dark: FULL_PALETTE } },
}));

const { hsl, ThemeProvider, BACKDROP_TEXT_VARS, SURFACE_TEXT_VARS } = require('@/lib/theme');
const mockUseColorScheme = useColorScheme as jest.Mock;

describe('hsl', () => {
  it('converts a space-separated brand token to comma form', () => {
    expect(hsl('primary')).toBe('hsl(142, 72%, 33%)');
  });
  it('falls back to transparent for an empty token', () => {
    expect(hsl('ring')).toBe('transparent');
  });
  it('caches by scheme and token', () => {
    expect(hsl('primary')).toBe(hsl('primary'));
    expect(hsl('primary', 'dark')).toBe('hsl(142, 72%, 33%)');
  });
});

describe('text variable bundles', () => {
  it('expose the backdrop and surface overrides', () => {
    expect(BACKDROP_TEXT_VARS['--foreground']).toBe('0 0% 100%');
    expect(SURFACE_TEXT_VARS['--card-foreground']).toBe(FULL_PALETTE.cardForeground);
  });
});

describe('ThemeProvider', () => {
  it('renders children under the light palette', () => {
    mockUseColorScheme.mockReturnValue({ colorScheme: 'light' });
    const { getByText } = render(
      <ThemeProvider>
        <Text>child</Text>
      </ThemeProvider>,
    );
    expect(getByText('child')).toBeTruthy();
  });
  it('renders children under the dark palette', () => {
    mockUseColorScheme.mockReturnValue({ colorScheme: 'dark' });
    const { getByText } = render(
      <ThemeProvider>
        <Text>dark-child</Text>
      </ThemeProvider>,
    );
    expect(getByText('dark-child')).toBeTruthy();
  });
});
