// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The theme picker on Personal Info: the driver picks Default, Soft or High
// Contrast, sees what the selected theme does, and Save stores it on the
// account (PATCH /v1/portal/driver/profile uiTheme) and applies it. An API
// before v0.1.51 has no uiTheme field: the choice then stays on the device.
// Rendered with the real English catalogue and a mocked API.

const mockGet = jest.fn();
const mockPatch = jest.fn();
const mockToast = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined) },
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual<typeof import('@/lib/api')>('@/lib/api'),
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: jest.fn(),
    patch: (...args: unknown[]) => mockPatch(...args),
    del: jest.fn(),
  },
}));
const mockAuthState: { setDriver: jest.Mock; driver: Record<string, unknown> } = {
  setDriver: jest.fn(),
  driver: {},
};
jest.mock('@/lib/auth', () => ({
  useAuth: Object.assign(
    (selector: (s: typeof mockAuthState) => unknown) => selector(mockAuthState),
    { getState: () => mockAuthState },
  ),
}));
jest.mock('@/lib/push', () => ({ registerPushToken: jest.fn(async () => undefined) }));
jest.mock('@/lib/i18n', () => ({
  enabledLanguageOptions: () => [{ code: 'en', label: 'English' }],
  setAppLanguage: jest.fn(async () => undefined),
  LANGUAGE_LABELS: { en: 'English' },
}));
jest.mock('@/features/price-display', () => ({ useCompanyPriceDisplay: () => 'gross' }));

jest.mock('@/components/ui', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  const Box = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(RN.View, null, children);
  return {
    Text: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
      React.createElement(RN.Text, { testID }, children),
    Screen: Box,
    Card: Box,
    BackButton: () => null,
    Segmented: () => null,
    Button: ({ title, onPress }: { title: string; onPress?: () => void }) =>
      React.createElement(
        RN.Pressable,
        { onPress, accessibilityRole: 'button' },
        React.createElement(RN.Text, null, title),
      ),
    Sheet: ({
      visible,
      title,
      children,
    }: {
      visible: boolean;
      title?: string;
      children?: React.ReactNode;
    }) =>
      visible ? React.createElement(RN.View, { testID: `sheet-${title ?? ''}` }, children) : null,
    Field: ({
      testID,
      value,
      onChangeText,
    }: {
      testID?: string;
      value: string;
      onChangeText?: (v: string) => void;
    }) => React.createElement(RN.TextInput, { testID, value, onChangeText }),
    useToast: () => ({ show: mockToast }),
    usePortalNotice: () => jest.fn(),
  };
});

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initTestI18n } from '@/test-utils/i18n';
import { FIRST_RENDER_TIMEOUT_MS } from '@/test-utils/timeouts';
import { useUiTheme } from '@/lib/ui-theme';
import PersonalInfoScreen from '../../../app/(tabs)/account/personal';

const BASE_DRIVER = {
  id: 'drv_1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  phone: '+12015550100',
  language: 'en',
  timezone: 'UTC',
  distanceUnit: 'km',
  priceDisplay: null,
  themePreference: 'light',
};
const clients: QueryClient[] = [];

async function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  clients.push(client);
  const screen = await render(
    <QueryClientProvider client={client}>
      <PersonalInfoScreen />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(client.isFetching()).toBe(0));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return screen;
}

beforeAll(async () => {
  await initTestI18n();
});

beforeEach(() => {
  jest.clearAllMocks();
  useUiTheme.setState({ theme: 'default', loaded: true });
  mockAuthState.driver = { ...BASE_DRIVER, uiTheme: 'default' };
  mockGet.mockImplementation((path: string) => {
    if (path === '/v1/portal/driver/mfa')
      return Promise.resolve({ mfaEnabled: false, factorProofKinds: ['password'] });
    if (path === '/v1/portal/branding')
      return Promise.resolve({ portalUrl: 'https://portal.test' });
    return Promise.reject(new Error(`unexpected GET ${path}`));
  });
});

afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
});

it(
  'shows the account theme with its description',
  async () => {
    mockAuthState.driver = { ...BASE_DRIVER, uiTheme: 'soft' };
    const screen = await renderScreen();
    expect(screen.getByText('Theme')).toBeTruthy();
    expect(screen.getByTestId('personal-ui-theme')).toHaveTextContent('Soft');
    expect(screen.getByTestId('personal-ui-theme-description')).toHaveTextContent(
      'Rounder corners, lighter borders and softer shadows.',
    );
  },
  FIRST_RENDER_TIMEOUT_MS,
);

it('offers the three themes and saves the pick on the account, then applies it', async () => {
  mockPatch.mockResolvedValue({ ...BASE_DRIVER, uiTheme: 'high-contrast' });
  const screen = await renderScreen();
  await fireEvent.press(screen.getByTestId('personal-ui-theme'));
  const sheet = screen.getByTestId('sheet-Theme');
  expect(sheet).toHaveTextContent(/Default/);
  expect(sheet).toHaveTextContent(/Soft/);
  expect(sheet).toHaveTextContent(/High Contrast/);
  await fireEvent.press(screen.getByTestId('personal-ui-theme-high-contrast'));
  expect(screen.getByTestId('personal-ui-theme-description')).toHaveTextContent(
    'Plain black and white surfaces, strong borders and heavier text for the clearest reading.',
  );
  // Not applied before Save.
  expect(useUiTheme.getState().theme).toBe('default');
  await fireEvent.press(screen.getByText('Save'));
  await waitFor(() =>
    expect(mockPatch).toHaveBeenCalledWith('/v1/portal/driver/profile', {
      uiTheme: 'high-contrast',
    }),
  );
  await waitFor(() => expect(useUiTheme.getState().theme).toBe('high-contrast'));
});

it('sends no theme when it did not change', async () => {
  mockPatch.mockResolvedValue(BASE_DRIVER);
  const screen = await renderScreen();
  await fireEvent.changeText(screen.getByTestId('personal-timezone'), 'Europe/Berlin');
  await fireEvent.press(screen.getByText('Save'));
  await waitFor(() =>
    expect(mockPatch).toHaveBeenCalledWith('/v1/portal/driver/profile', {
      timezone: 'Europe/Berlin',
    }),
  );
});

it('keeps the theme on the device when the API has no uiTheme field', async () => {
  mockAuthState.driver = { ...BASE_DRIVER };
  useUiTheme.setState({ theme: 'soft', loaded: true });
  mockPatch.mockResolvedValue(BASE_DRIVER);
  const screen = await renderScreen();
  expect(screen.getByTestId('personal-ui-theme')).toHaveTextContent('Soft');
  await fireEvent.press(screen.getByTestId('personal-ui-theme'));
  await fireEvent.press(screen.getByTestId('personal-ui-theme-default'));
  await fireEvent.press(screen.getByText('Save'));
  await waitFor(() => expect(useUiTheme.getState().theme).toBe('default'));
  expect(mockPatch).toHaveBeenCalledWith('/v1/portal/driver/profile', {});
});
