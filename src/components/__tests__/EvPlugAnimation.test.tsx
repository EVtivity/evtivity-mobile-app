// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { initTestI18n } from '@/test-utils/i18n';
import { EvPlugAnimation } from '@/components/EvPlugAnimation';

beforeAll(async () => {
  await initTestI18n();
});

function reduceMotion(on: boolean): void {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(on);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('EvPlugAnimation', () => {
  it('is an image with a translated label and draws the face of the connector type', async () => {
    reduceMotion(false);
    await render(<EvPlugAnimation connectorType="Type2" />);
    const img = screen.getByTestId('ev-plug-animation');
    expect(img.props.accessibilityRole).toBe('image');
    expect(img.props.accessibilityLabel).toBe('Plug the charging cable into your vehicle');
    expect(screen.getByTestId('ev-plug-face-type2')).toBeTruthy();
    expect(screen.getByTestId('ev-plug-loop')).toBeTruthy();
  });

  it('shows a neutral round inlet for an unknown type', async () => {
    reduceMotion(false);
    await render(<EvPlugAnimation connectorType="Other1PhMax16A" />);
    expect(screen.getByTestId('ev-plug-face-neutral')).toBeTruthy();
  });

  it('shows the still frame, plugged in with the light on, under reduced motion', async () => {
    reduceMotion(true);
    await render(<EvPlugAnimation connectorType="CCS2" />);
    await waitFor(() => {
      expect(screen.getByTestId('ev-plug-still')).toBeTruthy();
    });
    expect(screen.getByTestId('ev-plug-face-ccs2')).toBeTruthy();
    expect(screen.getByTestId('ev-plug-light').props.style.opacity).toBe(1);
  });
});
