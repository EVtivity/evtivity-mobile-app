// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The MFA changes this app cannot make: turning MFA off, adding a factor and
// changing the phone number need a fresh proof of a factor the driver holds,
// so the Security and Personal Info screens send the driver to the portal.
// Turning MFA on without a factor stays in the app and shows the recovery
// codes once. Rendered with the real English catalogue and a mocked API.

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockDel = jest.fn();
const mockToast = jest.fn();
const mockPortalNotice = jest.fn(async (_message: string, _url: string | null) => undefined);
const mockConfirm = jest.fn(async () => true);
const mockSetString = jest.fn(async () => true);

jest.mock('@/lib/api', () => ({
  ...jest.requireActual<typeof import('@/lib/api')>('@/lib/api'),
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    del: (...args: unknown[]) => mockDel(...args),
  },
}));
const mockAuthState = {
  biometricEnabled: false,
  setBiometricEnabled: jest.fn(),
  setDriver: jest.fn(),
  driver: {
    id: 'drv_1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    phone: '+12015550100',
    language: 'en',
    timezone: 'UTC',
    distanceUnit: 'km',
    priceDisplay: null,
  },
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
jest.mock('expo-screen-capture', () => ({ usePreventScreenCapture: jest.fn() }));
jest.mock('expo-clipboard', () => ({
  setStringAsync: (...args: unknown[]) => mockSetString(...(args as [])),
}));
jest.mock('@/components/PasswordRules', () => ({ PasswordRules: (): null => null }));

jest.mock('@/components/ui', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  const { apiErrorMessage, ApiError, portalPageUrl } =
    jest.requireActual<typeof import('@/lib/api')>('@/lib/api');
  const { useTranslation } = jest.requireActual<typeof import('react-i18next')>('react-i18next');
  const Box = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(RN.View, null, children);
  const Pressable = ({
    title,
    testID,
    onPress,
    disabled,
  }: {
    title: string;
    testID?: string;
    onPress?: () => void;
    disabled?: boolean;
  }) =>
    React.createElement(
      RN.Pressable,
      { testID, onPress: disabled === true ? undefined : onPress, accessibilityRole: 'button' },
      React.createElement(RN.Text, null, title),
    );
  return {
    Text: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
      React.createElement(RN.Text, { testID }, children),
    Screen: Box,
    Card: Box,
    BackButton: () => null,
    Badge: ({ label }: { label: string }) => React.createElement(RN.Text, null, label),
    Segmented: () => null,
    Button: Pressable,
    Sheet: ({
      visible,
      title,
      onClose,
      children,
    }: {
      visible: boolean;
      title?: string;
      onClose: () => void;
      children?: React.ReactNode;
    }) =>
      visible
        ? React.createElement(
            RN.View,
            { testID: `sheet-${title ?? ''}` },
            React.createElement(RN.Pressable, { testID: 'sheet-close', onPress: onClose }),
            children,
          )
        : null,
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
        error != null ? React.createElement(RN.Text, { testID: `${testID}-error` }, error) : null,
      ),
    useToast: () => ({ show: mockToast }),
    useConfirm: () => mockConfirm,
    usePortalNotice: () => mockPortalNotice,
    useApiErrorToast: () => {
      const { t } = useTranslation();
      return (err: unknown, opts?: { portalPath?: string; portalMessage?: string }) => {
        if (err instanceof ApiError && err.portalUrl != null) {
          void mockPortalNotice(
            opts?.portalMessage ?? apiErrorMessage(err, t),
            portalPageUrl(err.portalUrl, opts?.portalPath ?? '/'),
          );
          return;
        }
        mockToast(apiErrorMessage(err, t), 'error');
      };
    },
  };
});

import React from 'react';

import i18next from 'i18next';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import deCatalogue from '@/lib/i18n/de.json';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initTestI18n } from '@/test-utils/i18n';
import { ApiError } from '@/lib/api';
import SecurityScreen from '../../../app/(tabs)/account/security';
import PersonalInfoScreen from '../../../app/(tabs)/account/personal';

const PORTAL = 'https://portal.test';
let mfaStatus: Record<string, unknown> = {};
let branding: Record<string, unknown> = {};
const clients: QueryClient[] = [];

async function renderScreen(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  clients.push(client);
  const screen = await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  // Every query the screen made has answered, so a button that depends on the
  // MFA status or the portal URL is pressed only once they are loaded. The
  // mocked Button keeps its onPress prop while disabled, and fireEvent calls
  // it: a press before the MFA status loaded ran the no-factor setup.
  await waitFor(() => {
    const queries = client.getQueryCache().getAll();
    expect(queries.length).toBeGreaterThan(0);
    expect(queries.filter((q) => q.state.status === 'pending')).toHaveLength(0);
    expect(client.isFetching()).toBe(0);
  });
  // React Query tells its observers on the next tick: let the screen render
  // the loaded data before the test presses anything.
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
  mfaStatus = {
    mfaEnabled: false,
    mfaMethod: null,
    availableMethods: ['totp'],
    factorProofKinds: ['password'],
  };
  branding = { portalUrl: PORTAL };
  mockGet.mockImplementation((path: string) => {
    if (path === '/v1/portal/driver/mfa') return Promise.resolve(mfaStatus);
    if (path === '/v1/portal/branding') return Promise.resolve(branding);
    if (path === '/v1/security/public') return Promise.resolve({});
    return Promise.reject(new Error(`unexpected GET ${path}`));
  });
});

afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
});

describe('Security screen', () => {
  it('sends the driver to the portal security page to turn MFA off, with no request', async () => {
    mfaStatus = { ...mfaStatus, mfaEnabled: true, mfaMethod: 'totp', factorProofKinds: ['totp'] };
    const screen = await renderScreen(<SecurityScreen />);
    await fireEvent.press(await screen.findByTestId('security-mfa-disable'));
    expect(mockPortalNotice).toHaveBeenCalledWith(
      'Turn off two-factor authentication in the driver portal. It asks for your second factor, which this app cannot check.',
      'https://portal.test/account/security',
    );
    expect(mockDel).not.toHaveBeenCalled();
  });

  it('shows the message without a link when no portal URL is known', async () => {
    mfaStatus = { ...mfaStatus, mfaEnabled: true, mfaMethod: 'totp', factorProofKinds: ['totp'] };
    branding = {};
    const screen = await renderScreen(<SecurityScreen />);
    await fireEvent.press(await screen.findByTestId('security-mfa-disable'));
    expect(mockPortalNotice).toHaveBeenCalledWith(expect.any(String), null);
  });

  it('sends a driver with a passkey to the portal to add a method, with no request', async () => {
    mfaStatus = { ...mfaStatus, factorProofKinds: ['passkey'] };
    const screen = await renderScreen(<SecurityScreen />);
    await fireEvent.press(await screen.findByTestId('security-mfa-setup'));
    expect(mockPortalNotice).toHaveBeenCalledWith(
      'You already sign in with a second factor. Add another one in the driver portal, which asks for the one you have.',
      'https://portal.test/account/security',
    );
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('turns MFA on without a factor and shows the recovery codes once', async () => {
    const codes = ['aaaa-1111', 'bbbb-2222'];
    mockPost.mockImplementation((path: string) => {
      if (path === '/v1/portal/driver/mfa/setup') {
        return Promise.resolve({ secret: 'SECRET', qrDataUri: 'data:image/png;base64,x' });
      }
      if (path === '/v1/portal/driver/mfa/confirm') {
        return Promise.resolve({ success: true, recoveryCodes: codes });
      }
      return Promise.reject(new Error(`unexpected POST ${path}`));
    });
    const screen = await renderScreen(<SecurityScreen />);
    await fireEvent.press(await screen.findByTestId('security-mfa-setup'));
    expect(mockPost).toHaveBeenCalledWith('/v1/portal/driver/mfa/setup', { method: 'totp' });
    await fireEvent.changeText(screen.getByTestId('security-mfa-code'), '123456');
    await fireEvent.press(screen.getByText('Verify'));
    await waitFor(() => expect(screen.getByTestId('security-recovery-codes')).toBeTruthy());
    expect(mockPost).toHaveBeenCalledWith('/v1/portal/driver/mfa/confirm', {
      method: 'totp',
      code: '123456',
      challengeId: undefined,
    });
    expect(screen.getByText('aaaa-1111')).toBeTruthy();
    expect(screen.getByText('bbbb-2222')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('security-recovery-codes-copy'));
    await waitFor(() => expect(mockSetString).toHaveBeenCalledWith('aaaa-1111\nbbbb-2222'));
    expect(mockToast).toHaveBeenCalledWith('Recovery codes copied', 'success');

    await fireEvent.press(screen.getByTestId('security-recovery-codes-saved'));
    expect(screen.queryByTestId('security-recovery-codes')).toBeNull();
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('asks before closing the recovery codes without "I Saved Them"', async () => {
    mockPost.mockImplementation((path: string) =>
      Promise.resolve(
        path === '/v1/portal/driver/mfa/confirm' ? { success: true, recoveryCodes: ['c-1'] } : {},
      ),
    );
    const screen = await renderScreen(<SecurityScreen />);
    await fireEvent.press(await screen.findByTestId('security-mfa-setup'));
    await fireEvent.changeText(screen.getByTestId('security-mfa-code'), '123456');
    await fireEvent.press(screen.getByText('Verify'));
    await waitFor(() => expect(screen.getByTestId('security-recovery-codes')).toBeTruthy());

    mockConfirm.mockResolvedValueOnce(false);
    await fireEvent.press(screen.getByTestId('sheet-close'));
    await waitFor(() =>
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Close Without Saving?' }),
      ),
    );
    expect(screen.getByTestId('security-recovery-codes')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('sheet-close'));
    await waitFor(() => expect(screen.queryByTestId('security-recovery-codes')).toBeNull());
  });

  it('sends a confirm the server refuses with a portalUrl to the portal', async () => {
    mockPost.mockImplementation((path: string) =>
      path === '/v1/portal/driver/mfa/confirm'
        ? Promise.reject(
            new ApiError(400, {
              error: 'Use the driver portal at https://portal.test',
              code: 'VALIDATION_ERROR',
              portalUrl: PORTAL,
            }),
          )
        : Promise.resolve({}),
    );
    const screen = await renderScreen(<SecurityScreen />);
    await fireEvent.press(await screen.findByTestId('security-mfa-setup'));
    await fireEvent.changeText(screen.getByTestId('security-mfa-code'), '123456');
    await fireEvent.press(screen.getByText('Verify'));
    await waitFor(() =>
      expect(mockPortalNotice).toHaveBeenCalledWith(
        'You already sign in with a second factor. Add another one in the driver portal, which asks for the one you have.',
        'https://portal.test/account/security',
      ),
    );
  });
});

describe('Personal Info screen', () => {
  it('sends a driver with a factor to the portal to change the phone, with no request', async () => {
    mfaStatus = { ...mfaStatus, mfaEnabled: true, mfaMethod: 'sms', factorProofKinds: ['sms'] };
    const screen = await renderScreen(<PersonalInfoScreen />);
    await fireEvent.changeText(screen.getByTestId('personal-phone'), '+12015550177');
    await fireEvent.press(screen.getByText('Save'));
    const message =
      'Your account uses two-factor authentication. Change the phone number in the driver portal, which asks for your second factor.';
    await waitFor(() =>
      expect(mockPortalNotice).toHaveBeenCalledWith(
        message,
        'https://portal.test/account/personal',
      ),
    );
    expect(screen.getByTestId('personal-phone-error')).toHaveTextContent(message);
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('saves the phone of a driver without a factor', async () => {
    mockPatch.mockResolvedValue(mockAuthState.driver);
    const screen = await renderScreen(<PersonalInfoScreen />);
    await fireEvent.changeText(screen.getByTestId('personal-phone'), '+12015550177');
    await fireEvent.press(screen.getByText('Save'));
    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith('/v1/portal/driver/profile', {
        phone: '+12015550177',
      }),
    );
    expect(mockPortalNotice).not.toHaveBeenCalled();
  });

  it('says a server refusal with a portalUrl in the app language, under the field too', async () => {
    const error =
      'Changing the phone number of an account with two-factor authentication needs a confirmation this app cannot give yet. Change it in the driver portal at https://portal.test.';
    mockPatch.mockRejectedValue(
      new ApiError(400, {
        error,
        code: 'VALIDATION_ERROR',
        details: { phone: error },
        portalUrl: PORTAL,
      }),
    );
    const screen = await renderScreen(<PersonalInfoScreen />);
    await fireEvent.changeText(screen.getByTestId('personal-phone'), '+12015550177');
    await fireEvent.press(screen.getByText('Save'));
    const localized =
      'Your account uses two-factor authentication. Change the phone number in the driver portal, which asks for your second factor.';
    await waitFor(() =>
      expect(mockPortalNotice).toHaveBeenCalledWith(
        localized,
        'https://portal.test/account/personal',
      ),
    );
    expect(screen.getByTestId('personal-phone-error')).toHaveTextContent(localized);
    expect(screen.queryByText(error)).toBeNull();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('shows a refused save in the app language, not the server sentence (German)', async () => {
    await i18next.addResourceBundle('de', 'translation', deCatalogue, true, true);
    await i18next.changeLanguage('de');
    try {
      mockPatch.mockRejectedValue(
        new ApiError(400, {
          error: 'Invalid IANA timezone',
          code: 'VALIDATION_ERROR',
        }),
      );
      const screen = await renderScreen(<PersonalInfoScreen />);
      await fireEvent.changeText(screen.getByTestId('personal-phone'), '+12015550177');
      await fireEvent.press(screen.getByText('Speichern'));
      await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Validierungsfehler', 'error'));
    } finally {
      await i18next.changeLanguage('en');
    }
  });

  it('shows the server field errors under the fields in the app language (German)', async () => {
    await i18next.addResourceBundle('de', 'translation', deCatalogue, true, true);
    await i18next.changeLanguage('de');
    try {
      mockPatch.mockRejectedValue(
        new ApiError(400, {
          error: 'body/firstName String must contain at most 100 character(s)',
          code: 'VALIDATION_ERROR',
          details: {
            firstName: 'String must contain at most 100 character(s)',
            timezone: 'Invalid IANA timezone',
          },
        }),
      );
      const screen = await renderScreen(<PersonalInfoScreen />);
      await fireEvent.changeText(screen.getByTestId('personal-firstName'), 'A'.repeat(101));
      await fireEvent.press(screen.getByText('Speichern'));
      expect(await screen.findByTestId('personal-firstName-error')).toHaveTextContent(
        'Gib höchstens 100 Zeichen ein.',
      );
      expect(screen.getByTestId('personal-timezone-error')).toHaveTextContent(
        'Dieser Wert ist ungültig.',
      );
      expect(mockToast).toHaveBeenCalledWith('Prüfen Sie die markierten Felder.', 'error');
    } finally {
      await i18next.changeLanguage('en');
    }
  });
});
