// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Support turned off by the operator (supportEnabled false in GET
// /v1/portal/features): the Account screen leaves out its Support row and the
// support screens go home. Only an explicit false turns support off; a missing
// field (older server) or unloaded features keep it.

const mockFeatures = jest.fn();

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: { get: () => mockFeatures() },
  };
});

jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Redirect: ({ href }: { href: string }) => React.createElement(Text, null, `redirect ${href}`),
    Stack: () => React.createElement(Text, null, 'support stack'),
    useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  };
});

jest.mock('@/lib/auth', () => ({
  useAuth: (select: (s: { driver: null; logout: () => void }) => unknown) =>
    select({ driver: null, logout: jest.fn() }),
}));
jest.mock('@/features/avatar', () => ({ useDriverAvatar: () => ({ data: undefined }) }));
jest.mock('@/components/DriverAvatar', () => ({ DriverAvatar: () => null }));
jest.mock('@/components/AppHeader', () => ({ AppHeader: () => null }));
jest.mock('@/components/icons', () => new Proxy({}, { get: () => () => null }));
// The ui barrel pulls in reanimated (no native worklets under jest).
jest.mock('@/components/ui', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  const Box = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(RN.View, null, children);
  return {
    Screen: Box,
    Card: Box,
    Text: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(RN.Text, null, children),
    ListRow: ({ testID }: { testID?: string }) => React.createElement(RN.View, { testID }),
    Button: ({ testID }: { testID?: string }) => React.createElement(RN.View, { testID }),
  };
});

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isSupportEnabled } from '@/features/app-info';
import SupportLayout from '../../../app/(tabs)/support/_layout';
import AccountScreen from '../../../app/(tabs)/account/index';

async function renderWithQuery(element: React.ReactElement): Promise<void> {
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, retry: false } },
  });
  await render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}

async function renderLayout(): Promise<void> {
  await renderWithQuery(<SupportLayout />);
}

afterEach(() => {
  mockFeatures.mockReset();
});

describe('isSupportEnabled', () => {
  it('turns support off only for an explicit false', () => {
    expect(isSupportEnabled({ supportEnabled: false })).toBe(false);
    expect(isSupportEnabled({ supportEnabled: true })).toBe(true);
    expect(isSupportEnabled({})).toBe(true);
    expect(isSupportEnabled(undefined)).toBe(true);
  });
});

describe('support screens', () => {
  it('send the driver home while support is off', async () => {
    mockFeatures.mockResolvedValue({ supportEnabled: false });
    await renderLayout();
    expect(await screen.findByText('redirect /(tabs)')).toBeTruthy();
  });

  it('open while support is on', async () => {
    mockFeatures.mockResolvedValue({ supportEnabled: true });
    await renderLayout();
    expect(await screen.findByText('support stack')).toBeTruthy();
  });

  it('open for a server that does not report the switch', async () => {
    mockFeatures.mockResolvedValue({});
    await renderLayout();
    expect(await screen.findByText('support stack')).toBeTruthy();
    expect(screen.queryByText('redirect /(tabs)')).toBeNull();
  });
});

describe('Account screen', () => {
  it('leaves out the Support row while support is off', async () => {
    mockFeatures.mockResolvedValue({ supportEnabled: false });
    await renderWithQuery(<AccountScreen />);
    // The row shows until the features load, then goes.
    await screen.findByTestId('account-row-about');
    await waitFor(() => {
      expect(screen.queryByTestId('account-row-support')).toBeNull();
    });
  });

  it('shows the Support row while support is on', async () => {
    mockFeatures.mockResolvedValue({ supportEnabled: true });
    await renderWithQuery(<AccountScreen />);
    expect(await screen.findByTestId('account-row-support')).toBeTruthy();
  });
});
