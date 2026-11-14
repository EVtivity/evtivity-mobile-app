// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Station units (charger boxes) on the station screen, the search list, the
// location screen and Favorites. A station without units must render exactly
// as before (D3); a unit shows its name, only its EVSEs, and favorites and
// watches it by unitId. Starting stays at the station plus the EVSE number.

const mockParams: { current: Record<string, string | undefined> } = { current: {} };
const mockPush = jest.fn();
const mockStation: { current: unknown } = { current: null };
const mockLocation: { current: unknown } = { current: null };
const mockSearch: { current: unknown[] } = { current: [] };
const mockSearchError: { current: boolean } = { current: false };
const mockSearchRefetch = jest.fn();
const mockIsFavorite = jest.fn();
const mockIsWatching = jest.fn();
const mockFavoriteMutate = jest.fn();
const mockWatchMutate = jest.fn();
const mockStartMutate = jest.fn();
const mockFavorites: { current: unknown[] } = { current: [] };

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams.current,
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: () => Promise.resolve({ status: 'denied' }),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

jest.mock('expo-image', () => {
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  return { Image: RN.View };
});

jest.mock('@/components/icons', () => {
  const stub = (): null => null;
  return new Proxy({}, { get: () => stub });
});

jest.mock('@/components/ConnectorTile', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    ConnectorTile: ({
      testID,
      port,
      onPress,
    }: {
      testID?: string;
      port: number;
      onPress?: () => void;
    }) =>
      React.createElement(
        RN.Pressable,
        { testID, onPress },
        React.createElement(RN.Text, null, `Port ${String(port)}`),
      ),
  };
});
jest.mock('@/components/PricingCard', () => ({ PricingCard: () => null }));
jest.mock('@/components/AppHeader', () => ({ AppHeader: () => null }));
jest.mock('@/components/LocationImageThumb', () => ({ LocationImageThumb: () => null }));
jest.mock('@/components/PopularTimesChart', () => ({ PopularTimesChart: () => null }));

jest.mock('@/components/ui', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  const { Text } =
    jest.requireActual<typeof import('@/components/ui/Text')>('@/components/ui/Text');
  const Box = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(RN.View, null, children);
  const Pressable = ({
    children,
    testID,
    onPress,
  }: {
    children?: React.ReactNode;
    testID?: string;
    onPress?: () => void;
  }) => React.createElement(RN.Pressable, { testID, onPress }, children);
  const Button = ({
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
    Screen: Box,
    Card: Pressable,
    Badge: ({ label }: { label: string }) => React.createElement(Text, null, label),
    Button,
    Spinner: () => null,
    EmptyState: ({ title, action }: { title: string; action?: React.ReactNode }) =>
      React.createElement(RN.View, null, React.createElement(Text, null, title), action),
    Sheet: () => null,
    BackButton: () => null,
    Input: ({
      testID,
      value,
      onChangeText,
    }: {
      testID?: string;
      value?: string;
      onChangeText?: (v: string) => void;
    }) => React.createElement(RN.TextInput, { testID, value, onChangeText }),
    Segmented: () => null,
    StatusDot: () => null,
    useToast: () => ({ show: jest.fn() }),
    useApiErrorToast: () => jest.fn(),
    useConfirm: () => () => Promise.resolve(true),
  };
});

jest.mock('@/features/charge', () => ({
  useStation: () => ({ isLoading: false, isError: false, data: mockStation.current }),
  usePricing: () => ({ data: undefined }),
  useStartCharging: () => ({ mutate: mockStartMutate, isPending: false }),
  checkConnectorStatus: () => Promise.resolve({ connectorStatus: 'occupied' }),
  useSearchChargers: () => ({
    isLoading: false,
    isError: mockSearchError.current,
    data: mockSearchError.current ? undefined : mockSearch.current,
    refetch: mockSearchRefetch,
  }),
  useNearbyChargers: () => ({ isLoading: false, data: [] }),
  useSearchRoaming: () => ({ isLoading: false, data: [] }),
}));
jest.mock('@/features/favorites', () => ({
  useIsFavorite: (...args: unknown[]) => mockIsFavorite(...args),
  useToggleFavorite: () => ({ mutate: mockFavoriteMutate, isPending: false }),
  useFavorites: () => ({ isLoading: false, data: mockFavorites.current }),
}));
jest.mock('@/features/station-watch', () => ({
  useIsWatching: (...args: unknown[]) => mockIsWatching(...args),
  useToggleWatch: () => ({ mutate: mockWatchMutate, isPending: false }),
}));
jest.mock('@/features/payments', () => ({
  usePaymentMethods: () => ({ data: [], refetch: jest.fn() }),
}));
jest.mock('@/features/sessions', () => ({ useActiveSessions: () => ({ data: [] }) }));
jest.mock('@/features/price-display', () => ({ usePriceDisplay: () => null }));
jest.mock('@/features/account', () => ({ useDriverBilling: () => ({ data: null }) }));
jest.mock('@/features/app-info', () => ({
  useSupportEnabled: () => false,
  useFeatures: () => ({ data: { roamingEnabled: false } }),
}));
jest.mock('@/features/location', () => ({
  useLocationDetail: () => ({ isLoading: false, isError: false, data: mockLocation.current }),
  useLocationImages: () => ({ data: [] }),
  usePopularTimes: () => ({ data: [] }),
  useMapConfig: () => ({ data: undefined }),
}));
jest.mock('@/lib/use-debounced-value', () => ({ useDebouncedValue: (v: string) => v }));

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { initTestI18n } from '@/test-utils/i18n';
import { FIRST_RENDER_TIMEOUT_MS } from '@/test-utils/timeouts';
import StationDetailScreen from '../../../app/(tabs)/charge/[stationId]/index';
import ChargeScreen from '../../../app/(tabs)/charge/index';
import LocationDetailScreen from '../../../app/(tabs)/charge/location';
import FavoritesScreen from '../../../app/(tabs)/favorites';
import { NO_UNIT_PARAM } from '@/lib/station-units';

function evse(evseId: number, status: string, unitId?: string | null): Record<string, unknown> {
  return {
    evseId,
    ...(unitId !== undefined ? { unitId } : {}),
    connectors: [
      { connectorId: 1, connectorType: 'Type2', maxPowerKw: 11, maxCurrentAmps: 16, status },
    ],
    reservationExpiresAt: null,
    reserved: false,
    reservedByMe: false,
  };
}

function station(extra: Record<string, unknown>): Record<string, unknown> {
  return {
    stationId: 'CS-ABL',
    siteId: 'site_1',
    model: 'eM4',
    isOnline: true,
    isSimulator: false,
    siteName: 'Depot Garage',
    siteAddress: null,
    siteCity: null,
    siteState: null,
    paymentEnabled: false,
    maintenance: null,
    ...extra,
  };
}

// A station without units, as the API returned it before units existed.
const PLAIN = station({
  stationId: 'CS-0001',
  evses: [evse(1, 'occupied'), evse(2, 'charging')],
});
// The same station from an API with units: an empty list and null unit ids.
const PLAIN_NEW = station({
  stationId: 'CS-0001',
  units: [],
  evses: [evse(1, 'occupied', null), evse(2, 'charging', null)],
});
// Discussion 59: a master and its extender, two EVSEs a box, one loose EVSE.
const UNITS = station({
  units: [
    { id: 'unt_1', name: 'Box 1', evseIds: [1, 2], availableCount: 1 },
    { id: 'unt_2', name: 'Box 2', evseIds: [3, 4], availableCount: 0 },
  ],
  evses: [
    evse(1, 'available', 'unt_1'),
    evse(2, 'occupied', 'unt_1'),
    evse(3, 'occupied', 'unt_2'),
    evse(4, 'charging', 'unt_2'),
    evse(5, 'occupied', null),
  ],
});

beforeAll(async () => {
  await initTestI18n();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockIsFavorite.mockReturnValue({ data: { isFavorite: false, favoriteId: null } });
  mockIsWatching.mockReturnValue({ data: { isWatching: false, watchId: null } });
});

function shownPorts(): string[] {
  return screen.queryAllByText(/^Port \d+$/).map((n) => String(n.props.children));
}

describe('station screen', () => {
  it(
    'renders a station without units exactly as before (D3)',
    async () => {
      mockParams.current = { stationId: 'CS-0001', unit: 'unt_1' };
      mockStation.current = PLAIN;
      const before = await render(<StationDetailScreen />);
      const oldTree = JSON.stringify(before.toJSON());
      expect(screen.getByText('CS-0001')).toBeTruthy();
      expect(screen.queryByTestId('station-unit-name')).toBeNull();
      expect(screen.queryByTestId(/^station-unit-group-/)).toBeNull();
      expect(shownPorts()).toEqual(['Port 1', 'Port 2']);
      expect(mockIsFavorite).toHaveBeenLastCalledWith('CS-0001', null);
      expect(mockIsWatching).toHaveBeenLastCalledWith('CS-0001', null);
      await before.unmount();

      // The reply of an API with units changes nothing for such a station.
      mockStation.current = PLAIN_NEW;
      mockParams.current = { stationId: 'CS-0001' };
      const after = await render(<StationDetailScreen />);
      expect(JSON.stringify(after.toJSON())).toBe(oldTree);
      await fireEvent.press(screen.getByText('Add to Favorites'));
      expect(mockFavoriteMutate).toHaveBeenCalledWith({
        stationId: 'CS-0001',
        unitId: null,
        favoriteId: null,
        isFavorited: false,
      });
    },
    FIRST_RENDER_TIMEOUT_MS,
  );

  it('keeps the scanned connector focus of a station without units', async () => {
    mockParams.current = { stationId: 'CS-0001', evseId: '2' };
    mockStation.current = PLAIN_NEW;
    await render(<StationDetailScreen />);
    expect(shownPorts()).toEqual(['Port 2']);
    expect(screen.getByText('Show All 2 Ports')).toBeTruthy();
    expect(screen.queryByTestId('station-unit-name')).toBeNull();
  });

  it('shows one unit: its name as the title, only its EVSEs, favorites and watch by unit', async () => {
    mockParams.current = { stationId: 'CS-ABL', unit: 'unt_2' };
    mockStation.current = UNITS;
    await render(<StationDetailScreen />);
    expect(screen.getByTestId('station-unit-name').props.children).toBe('Box 2');
    expect(screen.getByText('CS-ABL')).toBeTruthy();
    expect(shownPorts()).toEqual(['Port 3', 'Port 4']);
    expect(mockIsFavorite).toHaveBeenLastCalledWith('CS-ABL', 'unt_2');
    expect(mockIsWatching).toHaveBeenLastCalledWith('CS-ABL', 'unt_2');

    await fireEvent.press(screen.getByText('Add to Favorites'));
    expect(mockFavoriteMutate).toHaveBeenCalledWith({
      stationId: 'CS-ABL',
      unitId: 'unt_2',
      favoriteId: null,
      isFavorited: false,
    });
    // Box 2 has no free EVSE (Box 1 has one): the watch button is offered.
    await fireEvent.press(screen.getByText('Notify Me When Free'));
    expect(mockWatchMutate).toHaveBeenCalledWith(
      { stationId: 'CS-ABL', unitId: 'unt_2', watchId: null, isWatching: false },
      expect.anything(),
    );
  });

  it('shows the EVSEs without a unit under the station name', async () => {
    mockParams.current = { stationId: 'CS-ABL', unit: NO_UNIT_PARAM };
    mockStation.current = UNITS;
    await render(<StationDetailScreen />);
    expect(screen.queryByTestId('station-unit-name')).toBeNull();
    expect(screen.getByText('CS-ABL')).toBeTruthy();
    expect(shownPorts()).toEqual(['Port 5']);
    expect(mockIsFavorite).toHaveBeenLastCalledWith('CS-ABL', null);
  });

  it('groups the whole station by unit', async () => {
    mockParams.current = { stationId: 'CS-ABL' };
    mockStation.current = UNITS;
    await render(<StationDetailScreen />);
    expect(screen.getByTestId('station-unit-group-unt_1')).toBeTruthy();
    expect(screen.getByTestId('station-unit-group-unt_2')).toBeTruthy();
    expect(screen.getByTestId(`station-unit-group-${NO_UNIT_PARAM}`)).toBeTruthy();
    expect(screen.getByText('Box 1')).toBeTruthy();
    expect(shownPorts()).toEqual(['Port 1', 'Port 2', 'Port 3', 'Port 4', 'Port 5']);
    expect(mockIsFavorite).toHaveBeenLastCalledWith('CS-ABL', null);
    // A free EVSE (Box 1) at the station: no station watch is offered.
    expect(screen.queryByText('Notify Me When Free')).toBeNull();
  });

  it('names the unit of a scanned connector and starts at the station EVSE', async () => {
    mockParams.current = { stationId: 'CS-ABL', evseId: '1' };
    mockStation.current = UNITS;
    await render(<StationDetailScreen />);
    expect(screen.getByTestId('station-unit-name').props.children).toBe('Box 1');
    expect(shownPorts()).toEqual(['Port 1']);
    expect(mockIsFavorite).toHaveBeenLastCalledWith('CS-ABL', 'unt_1');
    await fireEvent.press(screen.getByText('Show All 5 Ports'));
    expect(screen.queryByTestId('station-unit-name')).toBeNull();
    expect(shownPorts()).toHaveLength(5);
  });
});

describe('search list', () => {
  it('shows one card per unit row with its name and opens the unit', async () => {
    mockSearch.current = [
      {
        stationId: 'CS-ABL',
        model: null,
        isOnline: true,
        siteName: 'Depot Garage',
        siteAddress: null,
        siteCity: null,
        unitId: 'unt_1',
        unitName: 'Box 1',
        evseCount: 2,
        availableCount: 1,
        connectors: [],
      },
      {
        stationId: 'CS-ABL',
        model: null,
        isOnline: true,
        siteName: 'Depot Garage',
        siteAddress: null,
        siteCity: null,
        unitId: null,
        unitName: null,
        evseCount: 1,
        availableCount: 0,
        connectors: [],
      },
      {
        stationId: 'CS-0001',
        model: null,
        isOnline: true,
        siteName: 'Main Street',
        siteAddress: null,
        siteCity: null,
        unitId: null,
        unitName: null,
        evseCount: 2,
        availableCount: 1,
        connectors: [],
      },
    ];
    await render(<ChargeScreen />);
    await fireEvent.changeText(screen.getByTestId('charge-search'), 'garage');
    // Owner decision 2026-11-13: the box is the card title, the station under it.
    expect(screen.getByTestId('station-card-CS-ABL-unt_1-title').props.children).toBe('Box 1');
    expect(screen.getByTestId('station-card-CS-ABL-unt_1-station').props.children).toBe(
      'Depot Garage',
    );
    expect(screen.getByTestId('station-card-CS-ABL')).toBeTruthy();
    // A station without units keeps its card id and title and shows no station line.
    expect(screen.getByTestId('station-card-CS-0001')).toBeTruthy();
    expect(screen.getByTestId('station-card-CS-0001-title')).toBeTruthy();
    expect(screen.queryByTestId('station-card-CS-0001-station')).toBeNull();

    await fireEvent.press(screen.getByTestId('station-card-CS-ABL-unt_1'));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/charge/[stationId]',
      params: { stationId: 'CS-ABL', unit: 'unt_1' },
    });
    await fireEvent.press(screen.getByTestId('station-card-CS-ABL'));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/charge/[stationId]',
      params: { stationId: 'CS-ABL', unit: NO_UNIT_PARAM },
    });
    await fireEvent.press(screen.getByTestId('station-card-CS-0001'));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/charge/[stationId]',
      params: { stationId: 'CS-0001' },
    });
  });
});

describe('location screen', () => {
  const base = {
    siteId: 'site_1',
    name: 'Depot Garage',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    latitude: 0,
    longitude: 0,
    hoursOfOperation: null,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    stationCount: 1,
    evseCount: 2,
    availableCount: 1,
  };

  it('lists a station without units as one charger with its ports', async () => {
    mockParams.current = { siteId: 'site_1' };
    mockLocation.current = {
      ...base,
      chargers: [
        { stationId: 'CS-0001', stationName: 'CS-0001', evseId: 1, unitId: null, available: true },
      ],
      driverChargers: [
        {
          stationId: 'CS-0001',
          unitId: null,
          unitName: null,
          evseIds: [1],
          evseCount: 1,
          availableCount: 1,
        },
      ],
    };
    await render(<LocationDetailScreen />);
    expect(screen.getByTestId('location-chargers')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('location-charger-CS-0001'));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/charge/[stationId]',
      params: { stationId: 'CS-0001' },
    });
    await fireEvent.press(screen.getByTestId('location-port-CS-0001-1'));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/charge/[stationId]',
      params: { stationId: 'CS-0001', evseId: '1' },
    });
  });

  it('lists the chargers of a site with units and opens a unit', async () => {
    mockParams.current = { siteId: 'site_1' };
    mockLocation.current = {
      ...base,
      chargers: [
        {
          stationId: 'CS-ABL',
          stationName: 'CS-ABL',
          evseId: 1,
          unitId: 'unt_1',
          unitName: 'Box 1',
          available: true,
        },
        { stationId: 'CS-ABL', stationName: 'CS-ABL', evseId: 5, unitId: null, available: false },
      ],
    };
    await render(<LocationDetailScreen />);
    expect(screen.getByText('Chargers')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('location-charger-CS-ABL/unt_1'));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/charge/[stationId]',
      params: { stationId: 'CS-ABL', unit: 'unt_1' },
    });
    await fireEvent.press(screen.getByTestId('location-charger-CS-ABL'));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/charge/[stationId]',
      params: { stationId: 'CS-ABL', unit: NO_UNIT_PARAM },
    });
  });

  it('lists the ports of each unit from the reply grouping and opens a port', async () => {
    mockParams.current = { siteId: 'site_1' };
    mockLocation.current = {
      ...base,
      chargers: [1, 2].map((evseId) => ({
        stationId: 'CS-ABL',
        stationName: 'CS-ABL',
        evseId,
        unitId: 'unt_1',
        unitName: 'Box 1',
        connectorType: 'Type2',
        maxPowerKw: '22',
        status: 'available',
        available: true,
      })),
      driverChargers: [
        {
          stationId: 'CS-ABL',
          unitId: 'unt_1',
          unitName: 'Box 1',
          evseIds: [1, 2],
          evseCount: 2,
          availableCount: 2,
        },
      ],
    };
    await render(<LocationDetailScreen />);
    expect(screen.getByText('Port 1')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('location-port-CS-ABL/unt_1-2'));
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/charge/[stationId]',
      params: { stationId: 'CS-ABL', unit: 'unt_1', evseId: '2' },
    });
  });
});

describe('favorites screen', () => {
  it('names the unit of a unit favorite and opens it; a station favorite opens the station', async () => {
    const fav = {
      siteName: 'Depot Garage',
      siteAddress: null,
      siteCity: null,
      siteState: null,
      isOnline: true,
      evseCount: 2,
      availableCount: 1,
      createdAt: '2026-11-11T00:00:00Z',
    };
    mockFavorites.current = [
      { ...fav, id: 1, stationId: 'CS-ABL', unitId: 'unt_1', unitName: 'Box 1' },
      { ...fav, id: 2, stationId: 'CS-0001', unitId: null, unitName: null },
    ];
    await render(<FavoritesScreen />);
    expect(screen.getByText('Box 1')).toBeTruthy();
    const cards = screen.getAllByText('Depot Garage');
    await fireEvent.press(cards[0]!);
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/charge/[stationId]',
      params: { stationId: 'CS-ABL', unit: 'unt_1' },
    });
    await fireEvent.press(cards[1]!);
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/charge/[stationId]',
      params: { stationId: 'CS-0001' },
    });
  });
});

describe('charge search states', () => {
  afterEach(() => {
    mockSearchError.current = false;
  });

  it('shows an error with Retry when the search fails, never "no results"', async () => {
    await initTestI18n();
    mockSearchError.current = true;
    await render(<ChargeScreen />);
    await fireEvent.changeText(screen.getByTestId('charge-search'), 'garage');
    expect(screen.getByText('Could not search chargers. Please try again.')).toBeTruthy();
    expect(screen.queryByText('No chargers found')).toBeNull();
    await fireEvent.press(screen.getByTestId('charge-search-retry'));
    expect(mockSearchRefetch).toHaveBeenCalledTimes(1);
  });
});
