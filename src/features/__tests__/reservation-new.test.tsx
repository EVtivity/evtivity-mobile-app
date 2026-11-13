// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The new reservation screen confirms a created reservation with the
// portal's success message and goes back, rendered with the real English
// catalogue.

const mockBack = jest.fn();
const mockToast = jest.fn();
const mockShowApiError = jest.fn();
const mockMutateAsync = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ stationId: 'STATION-1' }),
}));

jest.mock('@/components/icons', () => ({ MapPin: (): null => null }));

jest.mock('@/features/reservations', () => ({
  useCreateReservation: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

jest.mock('@/features/charge', () => ({
  useSearchChargers: () => ({ data: [], isFetching: false }),
}));

// The ui barrel pulls in reanimated (no native worklets under jest): light
// stand-ins for what the screen renders.
jest.mock('@/components/ui', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  const { Text } =
    jest.requireActual<typeof import('@/components/ui/Text')>('@/components/ui/Text');
  const Box = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(RN.View, null, children);
  return {
    Text,
    Screen: Box,
    Card: Box,
    Badge: () => null,
    Spinner: () => null,
    BackButton: () => null,
    Chip: ({ label }: { label: string }) => React.createElement(Text, null, label),
    ChipGroup: () => null,
    Field: ({ testID, value }: { testID?: string; value: string }) =>
      React.createElement(RN.TextInput, { testID, value }),
    Button: ({
      title,
      testID,
      onPress,
      disabled,
    }: {
      title: string;
      testID?: string;
      onPress?: () => void;
      disabled?: boolean;
    }) =>
      React.createElement(
        RN.Pressable,
        { testID, onPress, disabled, accessibilityRole: 'button' },
        React.createElement(Text, null, title),
      ),
    useToast: () => ({ show: mockToast }),
    useApiErrorToast: () => mockShowApiError,
  };
});

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { initTestI18n } from '@/test-utils/i18n';
import { FIRST_RENDER_TIMEOUT_MS } from '@/test-utils/timeouts';
import NewReservationScreen from '../../../app/(tabs)/reservations/new';

beforeAll(async () => {
  await initTestI18n();
});

beforeEach(() => {
  jest.clearAllMocks();
});

it(
  'says the reservation was created and goes back',
  async () => {
    mockMutateAsync.mockResolvedValue({ id: 'r1' });
    const screen = await render(<NewReservationScreen />);
    await fireEvent.press(screen.getByTestId('reservation-submit'));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Reservation created.', 'success'));
    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ stationId: 'STATION-1' }),
    );
    expect(mockBack).toHaveBeenCalled();
  },
  FIRST_RENDER_TIMEOUT_MS,
);

it('shows the error and stays when the reservation fails', async () => {
  const err = new Error('refused');
  mockMutateAsync.mockRejectedValue(err);
  const screen = await render(<NewReservationScreen />);
  await fireEvent.press(screen.getByTestId('reservation-submit'));
  await waitFor(() => expect(mockShowApiError).toHaveBeenCalledWith(err));
  expect(mockToast).not.toHaveBeenCalled();
  expect(mockBack).not.toHaveBeenCalled();
});
