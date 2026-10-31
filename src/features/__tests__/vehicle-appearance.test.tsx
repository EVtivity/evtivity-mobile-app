// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// A vehicle's color and body type on the Vehicles screen: shown on the card,
// chosen when adding, changed and removed in the edit sheet. Rendered with the
// real English catalogue and a mocked API.

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

jest.mock('@/components/icons', () => ({
  Car: (): null => null,
  Trash2: (): null => null,
  Lock: (): null => null,
  Pencil: (): null => null,
  PlugZap: (): null => null,
}));

// The ui barrel pulls in reanimated (no native worklets under jest). Real
// primitives where they render plain views, light stand-ins for the rest.
jest.mock('@/components/ui', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  const { Text } =
    jest.requireActual<typeof import('@/components/ui/Text')>('@/components/ui/Text');
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
      React.createElement(Text, null, title),
    );
  return {
    Text,
    Card: jest.requireActual<typeof import('@/components/ui/Card')>('@/components/ui/Card').Card,
    Badge:
      jest.requireActual<typeof import('@/components/ui/Badge')>('@/components/ui/Badge').Badge,
    Spinner: () => null,
    Screen: Box,
    BackButton: () => null,
    EmptyState: ({ title }: { title: string }) => React.createElement(Text, null, title),
    Button: Pressable,
    AddButton: Pressable,
    ListItemCard: ({
      title,
      subtitle,
      testID,
      right,
      footer,
    }: {
      title: string;
      subtitle?: string;
      testID?: string;
      right?: React.ReactNode;
      footer?: React.ReactNode;
    }) =>
      React.createElement(
        RN.View,
        { testID },
        React.createElement(Text, null, title),
        subtitle != null ? React.createElement(Text, null, subtitle) : null,
        right,
        footer,
      ),
    Sheet: ({ visible, children }: { visible: boolean; children?: React.ReactNode }) =>
      visible ? React.createElement(RN.View, { testID: 'sheet' }, children) : null,
    ChipGroup: ({
      options,
      onSelect,
    }: {
      options: { value: string; label: string }[];
      onSelect: (v: string) => void;
    }) =>
      React.createElement(
        RN.View,
        null,
        options.map((o) =>
          React.createElement(Pressable, {
            key: o.value,
            title: o.label,
            testID: `chip-${o.value}`,
            onPress: () => onSelect(o.value),
          }),
        ),
      ),
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
import VehiclesScreen from '../../../app/(tabs)/account/vehicles';
import type { Vehicle } from '@/lib/types';

const KIA: Vehicle = {
  id: 'veh_1',
  make: 'Kia',
  model: 'EV9',
  year: '2025',
  color: 'green',
  bodyType: 'suv',
};

let vehicles: Vehicle[] = [];
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
      <VehiclesScreen />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(client.isFetching()).toBe(0));
  return screen;
}

afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
});

beforeAll(async () => {
  await initTestI18n();
});

beforeEach(() => {
  jest.clearAllMocks();
  vehicles = [KIA];
  mockGet.mockImplementation((path: string) => {
    if (path === '/v1/portal/vehicles') return Promise.resolve(vehicles);
    if (path === '/v1/portal/features') return Promise.resolve({});
    if (path === '/v1/portal/vehicles/lookup') {
      return Promise.resolve({
        makes: ['Ford'],
        models: [{ make: 'Ford', model: 'F-150 Lightning' }],
      });
    }
    return Promise.reject(new Error(`unexpected GET ${path}`));
  });
});

describe('Vehicles screen color and body type', () => {
  it('shows the year, color and body type on the card', async () => {
    const screen = await renderScreen();
    expect(await screen.findByText('2025 · Green · SUV')).toBeTruthy();
  });

  it('saves a new color and body type from the edit sheet', async () => {
    mockPatch.mockResolvedValue({ ...KIA, color: 'red', bodyType: 'van' });
    const screen = await renderScreen();
    await fireEvent.press(await screen.findByTestId('vehicle-edit-veh_1'));
    await fireEvent.press(await screen.findByTestId('chip-red'));
    await fireEvent.press(screen.getByTestId('chip-van'));
    await fireEvent.press(screen.getByTestId('vehicle-appearance-save'));
    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith('/v1/portal/vehicles/veh_1', {
        color: 'red',
        bodyType: 'van',
      }),
    );
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Vehicle saved', 'success'));
  });

  it('removes both with Not Set', async () => {
    mockPatch.mockResolvedValue({ ...KIA, color: null, bodyType: null });
    const screen = await renderScreen();
    await fireEvent.press(await screen.findByTestId('vehicle-edit-veh_1'));
    for (const notSet of await screen.findAllByTestId('chip-')) await fireEvent.press(notSet);
    await fireEvent.press(screen.getByTestId('vehicle-appearance-save'));
    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith('/v1/portal/vehicles/veh_1', {
        color: null,
        bodyType: null,
      }),
    );
  });

  it('sends the chosen color and body type with a new vehicle', async () => {
    mockPost.mockResolvedValue({ id: 'veh_2' });
    const screen = await renderScreen();
    await fireEvent.press(screen.getByTestId('vehicle-add'));
    await fireEvent.press(await screen.findByTestId('chip-Ford'));
    await fireEvent.press(await screen.findByTestId('chip-F-150 Lightning'));
    await fireEvent.press(screen.getByTestId('chip-blue'));
    await fireEvent.press(screen.getByTestId('chip-pickup_truck'));
    await fireEvent.press(screen.getByTestId('vehicle-submit'));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/v1/portal/vehicles', {
        make: 'Ford',
        model: 'F-150 Lightning',
        color: 'blue',
        bodyType: 'pickup_truck',
      }),
    );
  });
});
