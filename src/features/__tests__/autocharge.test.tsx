// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Autocharge in the app: the Vehicles screen (ids, Last Seen, the switch, the
// operator block) and the session's Vehicle ID card with "Use This Vehicle for
// Plug-In Charging", rendered with the real English catalogue and a mocked API.

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
      testID,
      right,
      footer,
    }: {
      title: string;
      testID?: string;
      right?: React.ReactNode;
      footer?: React.ReactNode;
    }) =>
      React.createElement(
        RN.View,
        { testID },
        React.createElement(Text, null, title),
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
import { ApiError } from '@/lib/api';
import { SessionVehicleIdCard } from '@/components/SessionVehicleIdCard';
import VehiclesScreen from '../../../app/(tabs)/account/vehicles';
import type { Vehicle } from '@/lib/types';

const WITH_IDS: Vehicle = {
  id: 'veh_1',
  make: 'Volkswagen',
  model: 'ID.4',
  year: '2024',
  vin: 'WVWZZZE2ZPP000001',
  evccid: 'AABBCCDDEEFF',
  autochargeEnabled: false,
  autochargeBlocked: false,
  lastSeen: { stationId: 'CS-1', siteName: 'Main', at: '2026-10-01T10:00:00.000Z' },
};

const NO_IDS: Vehicle = { id: 'veh_2', make: 'Kia', model: 'EV6', year: null };

let vehicles: Vehicle[] = [];
let features: Record<string, unknown> = {};

const clients: QueryClient[] = [];

// Renders, then lets the first queries settle inside act, so their late store
// updates never land outside it.
async function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  clients.push(client);
  const screen = await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
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
  vehicles = [WITH_IDS, NO_IDS];
  features = { autochargeEnabled: true };
  mockGet.mockImplementation((path: string) => {
    if (path === '/v1/portal/vehicles') return Promise.resolve(vehicles);
    if (path === '/v1/portal/features') return Promise.resolve(features);
    if (path === '/v1/portal/vehicles/lookup') return Promise.resolve({ makes: [], models: [] });
    return Promise.reject(new Error(`unexpected GET ${path}`));
  });
});

describe('Vehicles screen', () => {
  it('shows the vehicle ids, Last Seen and the Autocharge switch', async () => {
    const screen = await renderWithQuery(<VehiclesScreen />);
    expect(await screen.findByText('WVWZZZE2ZPP000001')).toBeTruthy();
    expect(screen.getByText('AA:BB:CC:DD:EE:FF')).toBeTruthy();
    expect(screen.getByTestId('vehicle-last-seen-veh_1')).toHaveTextContent(/Last Seen\s*CS-1, /);
    const sw = screen.getByTestId('vehicle-autocharge-veh_1');
    expect(sw.props.accessibilityLabel).toBe('Autocharge for Volkswagen ID.4');
    expect(sw.props.value).toBe(false);
    // A vehicle without a VIN or EVCCID cannot use Autocharge.
    expect(screen.queryByTestId('vehicle-autocharge-veh_2')).toBeNull();
  });

  it('turns Autocharge on through the vehicle update', async () => {
    mockPatch.mockResolvedValue({ ...WITH_IDS, autochargeEnabled: true });
    const screen = await renderWithQuery(<VehiclesScreen />);
    await fireEvent(await screen.findByTestId('vehicle-autocharge-veh_1'), 'valueChange', true);
    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith('/v1/portal/vehicles/veh_1', {
        autochargeEnabled: true,
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('vehicle-autocharge-veh_1').props.value).toBe(true),
    );
  });

  it('shows the portal text for a refused change and the switch settles back', async () => {
    mockPatch.mockRejectedValue(new ApiError(409, { code: 'VEHICLE_ID_IN_USE' }));
    const screen = await renderWithQuery(<VehiclesScreen />);
    await fireEvent(await screen.findByTestId('vehicle-autocharge-veh_1'), 'valueChange', true);
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        'Another vehicle already uses this VIN or EVCCID for Autocharge.',
        'error',
      ),
    );
    await waitFor(() =>
      expect(screen.getByTestId('vehicle-autocharge-veh_1').props.value).toBe(false),
    );
  });

  it('hides the switch where Autocharge is not offered, unless it is on', async () => {
    features = { autochargeEnabled: false };
    vehicles = [WITH_IDS, { ...WITH_IDS, id: 'veh_3', autochargeEnabled: true }];
    const screen = await renderWithQuery(<VehiclesScreen />);
    expect(await screen.findByTestId('vehicle-autocharge-veh_3')).toBeTruthy();
    expect(screen.queryByTestId('vehicle-autocharge-veh_1')).toBeNull();
  });

  it('locks a vehicle the operator blocked, without a switch', async () => {
    vehicles = [{ ...WITH_IDS, autochargeEnabled: true, autochargeBlocked: true }];
    const screen = await renderWithQuery(<VehiclesScreen />);
    expect(await screen.findByTestId('vehicle-autocharge-locked-veh_1')).toBeTruthy();
    expect(screen.getByTestId('vehicle-autocharge-blocked-veh_1')).toHaveTextContent(
      'The operator blocked Autocharge for this vehicle. Contact the operator to unblock it.',
    );
    expect(screen.queryByTestId('vehicle-autocharge-veh_1')).toBeNull();
  });
});

describe('Session Vehicle ID card', () => {
  const CAPTURE = { value: 'AABBCCDDEEFF', type: 'MacAddress', source: 'id_tag' };

  it('shows the captured id and where it came from', async () => {
    const screen = await renderWithQuery(
      <SessionVehicleIdCard
        sessionId="ses_1"
        capture={CAPTURE}
        autocharge
        autochargeAvailable={false}
        vehicle={null}
      />,
    );
    expect(screen.getByTestId('session-vehicle-id')).toHaveTextContent(
      'AA:BB:CC:DD:EE:FF (MAC Address)',
    );
    expect(screen.getByText('Captured from the charger')).toBeTruthy();
    expect(screen.getByTestId('session-autocharge')).toHaveTextContent('Autocharge');
    // The site does not offer Autocharge: nothing to enroll.
    expect(screen.queryByTestId('session-use-for-plug-in')).toBeNull();
  });

  it('hides the action when the vehicle already charges by plugging in with the id', async () => {
    const screen = await renderWithQuery(
      <SessionVehicleIdCard
        sessionId="ses_1"
        capture={CAPTURE}
        autocharge
        autochargeAvailable
        vehicle={{ id: 'veh_1', evccid: 'AABBCCDDEEFF', autochargeEnabled: true }}
      />,
    );
    expect(screen.queryByTestId('session-use-for-plug-in')).toBeNull();
  });

  it('claims the id for an existing vehicle', async () => {
    mockPost.mockResolvedValue({ vehicleId: 'veh_1', created: false, autochargeEnabled: true });
    const screen = await renderWithQuery(
      <SessionVehicleIdCard
        sessionId="ses_1"
        capture={CAPTURE}
        autocharge={false}
        autochargeAvailable
        vehicle={null}
      />,
    );
    await fireEvent.press(screen.getByTestId('session-use-for-plug-in'));
    expect(
      screen.getByText(
        'The charger sent AA:BB:CC:DD:EE:FF for this session. Save it on your vehicle and turn on Autocharge, and the next time you plug in, charging starts without a card or the app.',
      ),
    ).toBeTruthy();
    // The first vehicle is preselected once the list loads.
    expect(await screen.findByText('2024 Volkswagen ID.4')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('claim-submit'));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/v1/portal/sessions/ses_1/vehicle-claim', {
        vehicleId: 'veh_1',
        enableAutocharge: true,
      }),
    );
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith('Vehicle saved for plug-in charging', 'success'),
    );
    expect(screen.queryByTestId('sheet')).toBeNull();
  });

  it('claims the id for a new vehicle with Autocharge off', async () => {
    vehicles = [];
    mockPost.mockResolvedValue({ vehicleId: 'veh_9', created: true, autochargeEnabled: false });
    const screen = await renderWithQuery(
      <SessionVehicleIdCard
        sessionId="ses_1"
        capture={CAPTURE}
        autocharge={false}
        autochargeAvailable
        vehicle={null}
      />,
    );
    await fireEvent.press(screen.getByTestId('session-use-for-plug-in'));
    await fireEvent.press(screen.getByTestId('claim-submit'));
    expect(screen.getByTestId('claim-error')).toHaveTextContent('Enter the make and model.');
    expect(mockPost).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByTestId('claim-make'), ' Kia ');
    await fireEvent.changeText(screen.getByTestId('claim-model'), 'EV6');
    await fireEvent(screen.getByTestId('claim-autocharge'), 'valueChange', false);
    await fireEvent.press(screen.getByTestId('claim-submit'));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/v1/portal/sessions/ses_1/vehicle-claim', {
        vehicle: { make: 'Kia', model: 'EV6' },
        enableAutocharge: false,
      }),
    );
  });

  it.each([
    ['VEHICLE_ID_IN_USE', 409, 'Another vehicle already uses this VIN or EVCCID for Autocharge.'],
    [
      'VEHICLE_BLOCKED_BY_OPERATOR',
      403,
      'The operator blocked Autocharge for this vehicle. Contact the operator to unblock it.',
    ],
    ['SESSION_NO_VEHICLE_ID', 409, 'The charger sent no vehicle id for this session.'],
    ['VEHICLE_ID_REQUIRED', 400, 'Autocharge needs a VIN or an EVCCID on the vehicle.'],
  ])('shows the portal text for %s', async (code, status, text) => {
    mockPost.mockRejectedValue(new ApiError(status, { code }));
    const screen = await renderWithQuery(
      <SessionVehicleIdCard
        sessionId="ses_1"
        capture={CAPTURE}
        autocharge={false}
        autochargeAvailable
        vehicle={{ id: 'veh_1', evccid: null, autochargeEnabled: false }}
      />,
    );
    await fireEvent.press(screen.getByTestId('session-use-for-plug-in'));
    await fireEvent.press(screen.getByTestId('claim-submit'));
    await waitFor(() => expect(screen.getByTestId('claim-error')).toHaveTextContent(text));
    expect(screen.getByTestId('sheet')).toBeTruthy();
  });
});
