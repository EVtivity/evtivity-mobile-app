// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Card labels on the RFID Cards screen, rendered with the real English
// catalogue and a mocked API: a labelled card leads with its label, and the
// driver renames a card (a blocked one too) through PATCH /v1/portal/tokens/:id.

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
    Text: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(RN.Text, null, children),
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
    }: {
      title: string;
      subtitle?: string;
      footer?: React.ReactNode;
    }) =>
      React.createElement(
        RN.View,
        null,
        React.createElement(RN.Text, null, title),
        subtitle != null ? React.createElement(RN.Text, null, subtitle) : null,
        footer,
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
  return screen;
}

const card = {
  id: 'dtk_1',
  idToken: 'ABCD1234',
  tokenType: 'ISO14443',
  isActive: true,
  label: 'Company RFID card',
};

beforeAll(async () => {
  await initTestI18n();
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
});

it('leads with the label and keeps the masked number below it', async () => {
  mockGet.mockResolvedValue([card, { ...card, id: 'dtk_2', idToken: 'EFGH5678', label: null }]);
  const screen = await renderScreen();
  expect(await screen.findByText('Company RFID card')).toBeTruthy();
  expect(screen.getByText('••••1234 · ISO14443')).toBeTruthy();
  // A card without a label shows the masked number as before.
  expect(screen.getByText('••••5678')).toBeTruthy();
});

it('renames a card with the trimmed label', async () => {
  mockGet.mockResolvedValue([card]);
  mockPatch.mockResolvedValue({ ...card, label: 'Pool RFID card' });
  const screen = await renderScreen();
  await fireEvent.press(await screen.findByTestId('rfid-rename-ABCD1234'));
  expect(screen.getByTestId('rfid-label-input').props.value).toBe('Company RFID card');
  await fireEvent.changeText(screen.getByTestId('rfid-label-input'), '  Pool RFID card ');
  await fireEvent.press(screen.getByTestId('rfid-label-submit'));
  await waitFor(() =>
    expect(mockPatch).toHaveBeenCalledWith('/v1/portal/tokens/dtk_1', { label: 'Pool RFID card' }),
  );
  await waitFor(() => expect(mockToast).toHaveBeenCalledWith('RFID card renamed', 'success'));
});

it('removes the label when the field is emptied, also on a card the operator blocked', async () => {
  mockGet.mockResolvedValue([{ ...card, isActive: false, blockedByOperator: true }]);
  mockPatch.mockResolvedValue({ ...card, label: null });
  const screen = await renderScreen();
  await fireEvent.press(await screen.findByTestId('rfid-rename-ABCD1234'));
  await fireEvent.changeText(screen.getByTestId('rfid-label-input'), '   ');
  await fireEvent.press(screen.getByTestId('rfid-label-submit'));
  await waitFor(() =>
    expect(mockPatch).toHaveBeenCalledWith('/v1/portal/tokens/dtk_1', { label: null }),
  );
});

it('shows the API error of a refused label and keeps the sheet open', async () => {
  mockGet.mockResolvedValue([card]);
  mockPatch.mockRejectedValue(new ApiError(400, { code: 'VALIDATION_ERROR' }));
  const screen = await renderScreen();
  await fireEvent.press(await screen.findByTestId('rfid-rename-ABCD1234'));
  await fireEvent.press(screen.getByTestId('rfid-label-submit'));
  await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.any(String), 'error'));
  expect(screen.getByTestId('rfid-label-input')).toBeTruthy();
});
