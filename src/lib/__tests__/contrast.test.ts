// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { contrastRatio, WCAG_AA_BODY_TEXT } from '@/lib/contrast';

describe('contrastRatio', () => {
  it('is 21 for black on white and symmetric', () => {
    expect(contrastRatio('0 0% 0%', '0 0% 100%')).toBeCloseTo(21, 5);
    expect(contrastRatio('0 0% 100%', '0 0% 0%')).toBeCloseTo(21, 5);
  });

  it('is 1 for the same color', () => {
    expect(contrastRatio('142 72% 33%', '142 72% 33%')).toBeCloseTo(1, 5);
  });

  it('matches the WCAG value for a known pair', () => {
    // #767676 on white is the classic 4.54:1 grey.
    expect(contrastRatio('0 0% 46.27%', '0 0% 100%')).toBeCloseTo(4.54, 2);
    expect(WCAG_AA_BODY_TEXT).toBe(4.5);
  });

  it('handles a saturated hue', () => {
    // Pure red on white is about 4:1.
    expect(contrastRatio('0 100% 50%', '0 0% 100%')).toBeCloseTo(4, 1);
  });

  it('rejects a malformed token', () => {
    expect(() => contrastRatio('142 72%', '0 0% 100%')).toThrow('Invalid HSL token');
    expect(() => contrastRatio('a b c', '0 0% 100%')).toThrow('Invalid HSL token');
  });
});
