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
const mockDarkPalette = {
  ...FULL_PALETTE,
  card: '160 22% 11%',
  cardForeground: '160 18% 96%',
  mutedForeground: '156 12% 64%',
};

jest.mock('@/lib/config', () => ({
  BRAND: { colors: { light: FULL_PALETTE, dark: mockDarkPalette } },
}));

const {
  hsl,
  ThemeProvider,
  BACKDROP_TEXT_VARS,
  surfaceTextVars,
  useSurfaceTextVars,
} = require('@/lib/theme');
const mockUseColorScheme = useColorScheme as jest.Mock;

describe('hsl', () => {
  it('converts a space-separated brand token to comma form', async () => {
    expect(hsl('primary')).toBe('hsl(142, 72%, 33%)');
  });
  it('falls back to transparent for an empty token', async () => {
    expect(hsl('ring')).toBe('transparent');
  });
  it('caches by scheme and token', async () => {
    expect(hsl('primary')).toBe(hsl('primary'));
    expect(hsl('primary', 'dark')).toBe('hsl(142, 72%, 33%)');
  });
});

describe('text variable bundles', () => {
  it('expose the backdrop override', async () => {
    expect(BACKDROP_TEXT_VARS['--foreground']).toBe('0 0% 100%');
  });

  it('take the surface text vars from the light palette in light mode', async () => {
    const v = surfaceTextVars('light');
    expect(v).toEqual({
      '--foreground': FULL_PALETTE.cardForeground,
      '--card-foreground': FULL_PALETTE.cardForeground,
      '--muted-foreground': FULL_PALETTE.mutedForeground,
    });
    expect(surfaceTextVars(undefined)).toBe(v);
  });

  it('take the surface text vars from the dark palette in dark mode', async () => {
    expect(surfaceTextVars('dark')).toEqual({
      '--foreground': mockDarkPalette.cardForeground,
      '--card-foreground': mockDarkPalette.cardForeground,
      '--muted-foreground': mockDarkPalette.mutedForeground,
    });
    expect(surfaceTextVars('dark')).toBe(surfaceTextVars('dark'));
  });

  it('follow the current color scheme in useSurfaceTextVars', async () => {
    let seen: Record<string, string> | undefined;
    function Probe(): React.JSX.Element {
      seen = useSurfaceTextVars();
      return <Text>probe</Text>;
    }
    mockUseColorScheme.mockReturnValue({ colorScheme: 'dark' });
    await render(<Probe />);
    expect(seen?.['--foreground']).toBe(mockDarkPalette.cardForeground);
    mockUseColorScheme.mockReturnValue({ colorScheme: 'light' });
    await render(<Probe />);
    expect(seen?.['--foreground']).toBe(FULL_PALETTE.cardForeground);
  });
});

describe('ThemeProvider', () => {
  it('renders children under the light palette', async () => {
    mockUseColorScheme.mockReturnValue({ colorScheme: 'light' });
    const { getByText } = await render(
      <ThemeProvider>
        <Text>child</Text>
      </ThemeProvider>,
    );
    expect(getByText('child')).toBeTruthy();
  });
  it('renders children under the dark palette', async () => {
    mockUseColorScheme.mockReturnValue({ colorScheme: 'dark' });
    const { getByText } = await render(
      <ThemeProvider>
        <Text>dark-child</Text>
      </ThemeProvider>,
    );
    expect(getByText('dark-child')).toBeTruthy();
  });
});
