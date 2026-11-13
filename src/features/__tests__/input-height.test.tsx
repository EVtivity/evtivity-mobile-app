// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The shared Input is 52px on one line, the height of Button and of the icon
// send buttons next to it. A multiline input (the support reply box) starts at
// that height and grows with its text, so the send button beside it, aligned
// to the bottom of the row, keeps its size and stays level with the input.

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Input } from '@/components/ui/Input';

function classOf(testID: string): string {
  return String(screen.getByTestId(testID).props.className ?? '');
}

describe('Input height', () => {
  it('is 52px on one line', async () => {
    await render(<Input testID="single" />);
    expect(classOf('single').split(' ')).toContain('h-[52px]');
  });

  it('starts a multiline input at 52px and lets it grow', async () => {
    await render(<Input testID="multi" multiline className="max-h-28 flex-1" />);
    const classes = classOf('multi').split(' ');
    expect(classes).toEqual(expect.arrayContaining(['min-h-[52px]', 'py-3', 'leading-6']));
    expect(classes).not.toContain('h-[52px]');
    expect(classes).toContain('max-h-28');
    expect(screen.getByTestId('multi').props.textAlignVertical).toBe('top');
  });

  it('keeps a caller height on a multiline input', async () => {
    await render(<Input testID="tall" multiline className="h-32" />);
    expect(classOf('tall').split(' ')).toContain('h-32');
  });
});
