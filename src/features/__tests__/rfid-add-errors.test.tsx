// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Adding a card on the RFID Cards screen, rendered with the real English
// catalogue and a mocked API. A number that is another driver's vehicle id
// answers 409 VEHICLE_ID_IN_USE, which the screen explains for a card; other
// errors keep the shared error text.

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockToast = jest.fn();

jest.mock('@/lib/api', () => ({
  ...jest.requireActual<typeof import('@/lib/api')>('@/lib/api'),
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: jest.fn(),
    del: jest.fn(),
  },
}));
jest.mock('@/lib/auth', () => ({ useAuth: () => null }));
jest.mock('@/lib/push', () => ({ registerPushToken: jest.fn() }));
jest.mock('expo-screen-capture', () => ({ usePreventScreenCapture: jest.fn() }));
jest.mock('@/components/icons', () => ({ Lock: (): null => null, Nfc: (): null => null }));

jest.mock('@/components/ui', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  const { apiErrorMessage } = jest.requireActual<typeof import('@/lib/api')>('@/lib/api');
  const { useTranslation } = jest.requireActual<typeof import('react-i18next')>('react-i18next');
  const Box = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(RN.View, null, children);
  const Pressable = ({
    title,
    testID,
    onPress,
  }: {
    title: string;
    testID?: string;
    onPress?: () => void;
  }) =>
    React.createElement(
      RN.Pressable,
      { testID, onPress, accessibilityRole: 'button' },
      React.createElement(RN.Text, null, title),
    );
  return {
    Text: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(RN.Text, null, children),
    Screen: Box,
    BackButton: () => null,
    Spinner: () => null,
    EmptyState: ({ title }: { title: string }) => React.createElement(RN.Text, null, title),
    Button: Pressable,
    AddButton: Pressable,
    ListItemCard: ({ title }: { title: string }) => React.createElement(RN.Text, null, title),
    Sheet: ({ visible, children }: { visible: boolean; children?: React.ReactNode }) =>
      visible ? React.createElement(RN.View, { testID: 'sheet' }, children) : null,
    Field: ({
      testID,
      value,
      onChangeText,
    }: {
      testID?: string;
      value: string;
      onChangeText: (v: string) => void;
    }) => React.createElement(RN.TextInput, { testID, value, onChangeText }),
    useToast: () => ({ show: mockToast }),
    useApiErrorToast: () => {
      const { t } = useTranslation();
      return (err: unknown) => mockToast(apiErrorMessage(err, t), 'error');
    },
    useConfirm: () => () => Promise.resolve(true),
  };
});

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initTestI18n } from '@/test-utils/i18n';
import { ApiError } from '@/lib/api';
import RfidScreen from '../../../app/(tabs)/account/rfid';

const clients: QueryClient[] = [];

async function renderScreen() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  clients.push(client);
  const screen = await render(
    <QueryClientProvider client={client}>
      <RfidScreen />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(client.isFetching()).toBe(0));
  return screen;
}

async function addCard(screen: Awaited<ReturnType<typeof renderScreen>>): Promise<void> {
  await fireEvent.press(screen.getByTestId('rfid-add'));
  await fireEvent.changeText(screen.getByTestId('rfid-card-input'), 'WVWZZZE2ZPP000001');
  await fireEvent.press(screen.getByTestId('rfid-submit'));
}

beforeAll(async () => {
  await initTestI18n();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue([]);
});

afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
});

it('sends the card number with the default card type', async () => {
  mockPost.mockResolvedValue({ id: 'dtk_1' });
  const screen = await renderScreen();
  await addCard(screen);
  await waitFor(() =>
    expect(mockPost).toHaveBeenCalledWith('/v1/portal/tokens', { idToken: 'WVWZZZE2ZPP000001' }),
  );
  await waitFor(() => expect(mockToast).toHaveBeenCalledWith('RFID card added', 'success'));
});

it('explains a card number that is already in use as a vehicle id', async () => {
  mockPost.mockRejectedValue(new ApiError(409, { code: 'VEHICLE_ID_IN_USE' }));
  const screen = await renderScreen();
  await addCard(screen);
  await waitFor(() =>
    expect(mockToast).toHaveBeenCalledWith(
      'This number is already in use as a vehicle id and cannot be added as a card. Check the card number.',
      'error',
    ),
  );
  // The sheet stays open so the driver can fix the number.
  expect(screen.getByTestId('sheet')).toBeTruthy();
});

it('keeps the shared text for other refusals', async () => {
  mockPost.mockRejectedValue(new ApiError(409, { code: 'TOKEN_DUPLICATE' }));
  const screen = await renderScreen();
  await addCard(screen);
  await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Token already registered', 'error'));
});
