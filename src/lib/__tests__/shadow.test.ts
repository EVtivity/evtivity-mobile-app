// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { shadow, glow } from '@/lib/shadow';

describe('shadow', () => {
  it('exposes the four elevation tiers', () => {
    expect(Object.keys(shadow)).toEqual(['sm', 'md', 'lg', 'xl']);
    expect(shadow.md.elevation).toBe(4);
  });
});

describe('glow', () => {
  it('tints the shadow with the given color', () => {
    const style = glow('#22c55e');
    expect(style.shadowColor).toBe('#22c55e');
    expect(style.elevation).toBe(8);
  });
});
