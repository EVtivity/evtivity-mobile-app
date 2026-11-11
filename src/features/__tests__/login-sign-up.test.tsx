// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The sign-in screen offers sign-up only once GET /v1/portal/features is read
// and does not say registrationEnabled: false (a server older than v0.1.51
// sends no value and allows registration), as the portal does.

const mockFeatures = jest.fn();

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: {
      get: (url: string) => (url === '/v1/portal/features' ? mockFeatures() : Promise.resolve({})),
      post: jest.fn(),
    },
  };
});

jest.mock('@/lib/auth', () => ({
  useAuth: (select: (s: { login: jest.Mock; setMfaPending: jest.Mock }) => unknown) =>
    select({ login: jest.fn(), setMfaPending: jest.fn() }),
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
    Link: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

jest.mock('@/components/AuthHeader', () => ({ AuthHeader: () => null }));
jest.mock('@/components/AuthFooter', () => ({ AuthFooter: () => null }));

// The ui barrel pulls in reanimated (no native worklets under jest).
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
    useApiErrorToast: () => jest.fn(),
    Button: ({ title, testID }: { title: string; testID?: string }) =>
      React.createElement(
        RN.Pressable,
        { testID, accessibilityRole: 'button' },
        React.createElement(Text, null, title),
      ),
    Field: ({ testID }: { testID?: string }) => React.createElement(RN.TextInput, { testID }),
  };
});

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initTestI18n } from '@/test-utils/i18n';
import LoginScreen from '../../../app/(auth)/login';

async function renderLogin(): Promise<void> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <LoginScreen />
    </QueryClientProvider>,
  );
  await screen.findByTestId('login-submit');
}

beforeAll(async () => {
  await initTestI18n();
});

beforeEach(() => {
  jest.clearAllMocks();
});

it('offers sign-up while registration is open', async () => {
  mockFeatures.mockResolvedValue({ registrationEnabled: true });
  await renderLogin();
  expect(await screen.findByTestId('login-sign-up')).toBeTruthy();
});

it('hides sign-up while registration is closed', async () => {
  mockFeatures.mockResolvedValue({ registrationEnabled: false });
  await renderLogin();
  await new Promise((resolve) => setImmediate(resolve));
  expect(mockFeatures).toHaveBeenCalled();
  expect(screen.queryByTestId('login-sign-up')).toBeNull();
});

it('hides sign-up while the features load', async () => {
  mockFeatures.mockReturnValue(new Promise(() => undefined));
  await renderLogin();
  expect(screen.queryByTestId('login-sign-up')).toBeNull();
});

it('hides sign-up when the features cannot be read', async () => {
  mockFeatures.mockRejectedValue(new Error('network'));
  await renderLogin();
  await new Promise((resolve) => setImmediate(resolve));
  expect(screen.queryByTestId('login-sign-up')).toBeNull();
});

it('offers sign-up on a server that does not report the switch', async () => {
  mockFeatures.mockResolvedValue({ reservationEnabled: true });
  await renderLogin();
  expect(await screen.findByTestId('login-sign-up')).toBeTruthy();
});
