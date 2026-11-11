// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { shadow, glow } from '@/lib/shadow';
import { themeShadows } from '@/lib/theme-tokens';
import { useUiTheme } from '@/lib/ui-theme';

describe('shadow', () => {
  it('exposes the four elevation tiers', () => {
    expect(Object.keys(shadow)).toEqual(['sm', 'md', 'lg', 'xl']);
    expect(shadow.md.elevation).toBe(4);
  });

  it('follows the active theme', () => {
    useUiTheme.setState({ theme: 'soft' });
    expect(shadow.md).toBe(themeShadows('soft').md);
    expect(shadow.sm.shadowOpacity).toBeLessThan(
      themeShadows('default').sm.shadowOpacity as number,
    );
    useUiTheme.setState({ theme: 'default' });
    expect(shadow.lg).toBe(themeShadows('default').lg);
    expect(shadow.xl.elevation).toBe(18);
  });
});

describe('glow', () => {
  it('tints the shadow with the given color', () => {
    const style = glow('#22c55e');
    expect(style.shadowColor).toBe('#22c55e');
    expect(style.elevation).toBe(8);
  });
});
