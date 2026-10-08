// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The ui barrel pulls in reanimated (no native worklets under jest). Load only
// the primitives this component renders.
jest.mock('@/components/ui', () => ({
  Card: jest.requireActual('@/components/ui/Card').Card,
  Text: jest.requireActual('@/components/ui/Text').Text,
  Badge: jest.requireActual('@/components/ui/Badge').Badge,
}));

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { initTestI18n } from '@/test-utils/i18n';
import { StationCard } from '@/components/StationCard';
import { stationCardTestId } from '@/lib/test-ids';

beforeAll(async () => {
  await initTestI18n();
});

describe('StationCard', () => {
  it('is found and pressed by its station testID', async () => {
    const onPress = jest.fn();
    const { getByTestId } = await render(
      <StationCard
        testID={stationCardTestId('CS-0001')}
        name="Main Street"
        address="1 Main St"
        isOnline
        availableCount={1}
        evseCount={2}
        onPress={onPress}
      />,
    );
    await fireEvent.press(getByTestId('station-card-CS-0001'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
