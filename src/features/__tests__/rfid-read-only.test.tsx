// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The RFID Cards screen while the operator manages the cards
// (rfidSelfServiceEnabled false in GET /v1/portal/features): strictly read-only,
// with the cards listed, the note to contact the operator, and no add, rename
// or activation control. A missing flag (older server) keeps every control.

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockToast = jest.fn();

jest.mock('@/lib/api', () => ({
  ...jest.requireActual<typeof import('@/lib/api')>('@/lib/api'),
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
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
    Text: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
      React.createElement(RN.Text, { testID }, children),
    Screen: Box,
    BackButton: () => null,
    Spinner: () => null,
    EmptyState: ({ title }: { title: string }) => React.createElement(RN.Text, null, title),
    Button: Pressable,
    AddButton: Pressable,
    ListItemCard: ({
      title,
      subtitle,
      footer,
      right,
    }: {
      title: string;
      subtitle?: string;
      footer?: React.ReactNode;
      right?: React.ReactNode;
    }) =>
      React.createElement(
        RN.View,
        null,
        React.createElement(RN.Text, null, title),
        subtitle != null ? React.createElement(RN.Text, null, subtitle) : null,
        footer,
        right,
      ),
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
  return { screen, client };
}

const card = {
  id: 'dtk_1',
  idToken: 'ABCD1234',
  tokenType: 'ISO14443',
  isActive: true,
  label: 'Company RFID card',
};

/** Answers the card list and the feature flags. */
function mockGets(cards: unknown[], features: Record<string, unknown>): void {
  mockGet.mockImplementation((path: string) =>
    Promise.resolve(path === '/v1/portal/features' ? features : cards),
  );
}

beforeAll(async () => {
  await initTestI18n();
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
});

it('lists the cards read-only with the operator note, and no add, rename or switch', async () => {
  mockGets([card, { ...card, id: 'dtk_2', idToken: 'EFGH5678', label: null, isActive: false }], {
    rfidSelfServiceEnabled: false,
  });
  const { screen } = await renderScreen();
  expect(await screen.findByText('Company RFID card')).toBeTruthy();
  expect(screen.getByTestId('rfid-managed-by-operator')).toBeTruthy();
  expect(screen.getByText(/contact the operator/)).toBeTruthy();
  expect(screen.queryByTestId('rfid-add')).toBeNull();
  expect(screen.queryByTestId('rfid-rename-ABCD1234')).toBeNull();
  expect(screen.queryByTestId('rfid-switch-ABCD1234')).toBeNull();
  expect(screen.queryByTestId('rfid-switch-EFGH5678')).toBeNull();
  // Without a switch the inactive card says so.
  expect(screen.getByTestId('rfid-status-EFGH5678')).toBeTruthy();
  expect(screen.getByText('Inactive')).toBeTruthy();
});

it('says no cards are assigned when the operator manages an empty list', async () => {
  mockGets([], { rfidSelfServiceEnabled: false });
  const { screen } = await renderScreen();
  expect(await screen.findByText('No RFID cards are assigned to you')).toBeTruthy();
});

it('keeps every control when the server does not send the flag', async () => {
  mockGets([card], {});
  const { screen } = await renderScreen();
  expect(await screen.findByTestId('rfid-add')).toBeTruthy();
  expect(screen.getByTestId('rfid-rename-ABCD1234')).toBeTruthy();
  expect(screen.getByTestId('rfid-switch-ABCD1234')).toBeTruthy();
  expect(screen.queryByTestId('rfid-managed-by-operator')).toBeNull();
});

it('shows the refusal of a stale screen and reloads the feature flags', async () => {
  mockGets([card], {});
  mockPatch.mockRejectedValue(
    new ApiError(403, { error: 'refused', code: 'RFID_SELF_SERVICE_DISABLED' }),
  );
  const { screen, client } = await renderScreen();
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  await fireEvent.press(await screen.findByTestId('rfid-rename-ABCD1234'));
  await fireEvent.press(screen.getByTestId('rfid-label-submit'));
  await waitFor(() =>
    expect(mockToast).toHaveBeenCalledWith(
      expect.stringContaining('Your operator manages your RFID cards'),
      'error',
    ),
  );
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['features'] });
});
