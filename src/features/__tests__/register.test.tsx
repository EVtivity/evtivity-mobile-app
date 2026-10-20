// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The register screen: the API answers the same for a new and a known email
// and signs nobody in, so the screen asks the driver to check the inbox.

const mockRegister = jest.fn();
const mockReplace = jest.fn();
const mockGet = jest.fn();

// The screen loads the password policy from GET /v1/security/public.
jest.mock('@/lib/api', () => {
  const actual = jest.requireActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: { get: (...args: unknown[]) => mockGet(...args) } };
});

jest.mock('@/lib/auth', () => ({
  useAuth: (select: (s: { register: typeof mockRegister }) => unknown) =>
    select({ register: mockRegister }),
}));

jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
    Link: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

jest.mock('@/components/AuthHeader', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Text } =
    jest.requireActual<typeof import('@/components/ui/Text')>('@/components/ui/Text');
  return { AuthHeader: ({ title }: { title: string }) => React.createElement(Text, null, title) };
});
jest.mock('@/components/AuthFooter', () => ({ AuthFooter: () => null }));
jest.mock('@/components/PasswordRules', () => ({ PasswordRules: () => null }));

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
    Button: ({
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
      ),
    Field: ({
      testID,
      value,
      onChangeText,
      error,
    }: {
      testID?: string;
      value: string;
      onChangeText: (v: string) => void;
      error?: string;
    }) =>
      React.createElement(
        RN.View,
        null,
        React.createElement(RN.TextInput, { testID, value, onChangeText }),
        error != null ? React.createElement(Text, null, error) : null,
      ),
  };
});

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initTestI18n } from '@/test-utils/i18n';
import { ApiError } from '@/lib/api';
import RegisterScreen from '../../../app/(auth)/register';

let client: QueryClient;

async function fillAndSubmit(): Promise<void> {
  client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false } } });
  await render(
    <QueryClientProvider client={client}>
      <RegisterScreen />
    </QueryClientProvider>,
  );
  await fireEvent.changeText(screen.getByTestId('register-firstName'), 'Jane');
  await fireEvent.changeText(screen.getByTestId('register-lastName'), 'Doe');
  await fireEvent.changeText(screen.getByTestId('register-email'), ' jane@example.com ');
  await fireEvent.changeText(screen.getByTestId('register-password'), 'Str0ng-Passw0rd!');
  // Submit once the policy loaded, so the screen checks the live one.
  await waitFor(() => expect(client.getQueryState(['security-public'])?.status).toBe('success'));
  await fireEvent.press(screen.getByTestId('register-submit'));
}

beforeAll(async () => {
  await initTestI18n();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ recaptchaEnabled: false });
});

it('asks the driver to check the inbox, then goes back to sign in', async () => {
  mockRegister.mockResolvedValue(undefined);
  await fillAndSubmit();
  await waitFor(() => expect(screen.getByText('Check Your Email')).toBeTruthy());
  expect(mockRegister).toHaveBeenCalledWith({
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    password: 'Str0ng-Passw0rd!',
  });
  expect(
    screen.getByText(
      'We sent an email to jane@example.com. Open the link in it to continue, then sign in.',
    ),
  ).toBeTruthy();
  await fireEvent.press(screen.getByTestId('register-back-to-login'));
  expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
});

it('keeps the form and shows a refused registration', async () => {
  mockRegister.mockRejectedValue(
    new ApiError(429, {
      error: 'Too many accounts were registered with this phone number.',
      code: 'PHONE_REGISTRATION_LIMITED',
    }),
  );
  await fillAndSubmit();
  await waitFor(() => expect(mockRegister).toHaveBeenCalled());
  expect(
    await screen.findByText('Too many accounts were registered with this phone number.'),
  ).toBeTruthy();
  expect(screen.queryByText('Check Your Email')).toBeNull();
  expect(screen.getByTestId('register-submit')).toBeTruthy();
});

it('names the rules a WEAK_PASSWORD reply lists and reloads the policy', async () => {
  mockRegister.mockRejectedValue(
    new ApiError(400, { error: 'Weak password', code: 'WEAK_PASSWORD', missing: ['symbol'] }),
  );
  await fillAndSubmit();
  await waitFor(() => expect(mockRegister).toHaveBeenCalled());
  expect(await screen.findByText('Password needs a special character.')).toBeTruthy();
  await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
  expect(mockGet).toHaveBeenCalledWith('/v1/security/public');
});

it('checks the live policy before submitting', async () => {
  mockGet.mockResolvedValue({
    passwordPolicy: {
      minLength: 20,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSymbol: false,
    },
  });
  await fillAndSubmit();
  expect(await screen.findByText('Password needs at least 20 characters.')).toBeTruthy();
  expect(mockRegister).not.toHaveBeenCalled();
});
