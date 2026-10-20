// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Email and SMS MFA codes belong to a challenge: the API checks them only with
// its challengeId. The login screen keeps the id, the MFA screen sends it and
// a resend replaces it.

const mockLogin = jest.fn();
const mockVerifyMfa = jest.fn();
const mockPost = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();

interface Pending {
  mfaToken: string;
  method: string;
  challengeId?: number;
}

const mockAuthState: {
  mfaPending: Pending | null;
  status: string;
  login: typeof mockLogin;
  verifyMfa: typeof mockVerifyMfa;
  setMfaPending: (p: Pending | null) => void;
} = {
  mfaPending: null,
  status: 'unauthenticated',
  login: mockLogin,
  verifyMfa: mockVerifyMfa,
  setMfaPending: (p) => {
    mockAuthState.mfaPending = p;
  },
};

jest.mock('@/lib/auth', () => ({
  useAuth: (select: (s: typeof mockAuthState) => unknown) => select(mockAuthState),
}));

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: { post: (...args: unknown[]) => mockPost(...args) } };
});

jest.mock('expo-screen-capture', () => ({ usePreventScreenCapture: () => undefined }));

jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ replace: mockReplace, push: mockPush }),
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
    FormSuccess: () => null,
    useApiErrorToast: () => jest.fn(),
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
    }: {
      testID?: string;
      value: string;
      onChangeText: (v: string) => void;
    }) => React.createElement(RN.TextInput, { testID, value, onChangeText }),
  };
});

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { initTestI18n } from '@/test-utils/i18n';
import LoginScreen from '../../../app/(auth)/login';
import MfaScreen from '../../../app/(auth)/mfa';

beforeAll(async () => {
  await initTestI18n();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthState.mfaPending = null;
  mockAuthState.status = 'unauthenticated';
  mockVerifyMfa.mockResolvedValue(undefined);
});

async function signIn(): Promise<void> {
  await render(<LoginScreen />);
  await fireEvent.changeText(screen.getByTestId('login-email'), 'jane@example.com');
  await fireEvent.changeText(screen.getByTestId('login-password'), 'Str0ng-Passw0rd!');
  await fireEvent.press(screen.getByTestId('login-submit'));
}

it('keeps the challenge id of an email code from the login reply', async () => {
  mockLogin.mockResolvedValue({
    mfaRequired: true,
    mfaMethod: 'email',
    mfaToken: 'mt',
    challengeId: 7,
  });
  await signIn();
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/(auth)/mfa'));
  expect(mockAuthState.mfaPending).toEqual({ mfaToken: 'mt', method: 'email', challengeId: 7 });
});

it('keeps no challenge id for a TOTP login', async () => {
  mockLogin.mockResolvedValue({ mfaRequired: true, mfaMethod: 'totp', mfaToken: 'mt' });
  await signIn();
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/(auth)/mfa'));
  expect(mockAuthState.mfaPending).toEqual({ mfaToken: 'mt', method: 'totp' });
});

async function enterCode(): Promise<void> {
  await fireEvent.changeText(screen.getByTestId('mfa-code'), ' 123456 ');
  await fireEvent.press(screen.getByTestId('mfa-verify'));
}

it('sends the challenge id with an SMS code', async () => {
  mockAuthState.mfaPending = { mfaToken: 'mt', method: 'sms', challengeId: 7 };
  await render(<MfaScreen />);
  await enterCode();
  await waitFor(() => expect(mockVerifyMfa).toHaveBeenCalledWith('mt', '123456', 7));
});

it('sends no challenge id with a TOTP code', async () => {
  mockAuthState.mfaPending = { mfaToken: 'mt', method: 'totp' };
  await render(<MfaScreen />);
  await enterCode();
  await waitFor(() => expect(mockVerifyMfa).toHaveBeenCalledWith('mt', '123456', undefined));
});

it('sends the challenge id of the resent code', async () => {
  mockAuthState.mfaPending = { mfaToken: 'mt', method: 'email', challengeId: 7 };
  mockPost.mockResolvedValue({ challengeId: 8 });
  await render(<MfaScreen />);
  await fireEvent.press(screen.getByTestId('mfa-resend'));
  await waitFor(() =>
    expect(mockPost).toHaveBeenCalledWith(
      '/v1/portal/auth/mfa/resend',
      { mfaToken: 'mt' },
      { auth: false },
    ),
  );
  await waitFor(() =>
    expect(mockAuthState.mfaPending).toEqual({ mfaToken: 'mt', method: 'email', challengeId: 8 }),
  );
  await enterCode();
  await waitFor(() => expect(mockVerifyMfa).toHaveBeenCalledWith('mt', '123456', 8));
});
