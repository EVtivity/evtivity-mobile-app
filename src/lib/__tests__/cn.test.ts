// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { cn } from '@/lib/cn';

describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });
  it('drops falsy entries', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });
  it('resolves conflicting tailwind utilities last-wins', () => {
    expect(cn('text-white', 'text-muted-foreground')).toBe('text-muted-foreground');
  });
});
