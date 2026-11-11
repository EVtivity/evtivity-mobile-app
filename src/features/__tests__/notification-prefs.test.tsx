// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The notification preferences matrix (GitHub discussion 56), rendered with
// the real English catalogue and a mocked API: one switch per event and
// configured channel, grouped by topic, mandatory cells locked, the All
// controls, and the PUT bodies with only the changed cells.

const mockGet = jest.fn();
const mockPut = jest.fn();
const mockToast = jest.fn();

jest.mock('@/lib/api', () => ({
  ...jest.requireActual<typeof import('@/lib/api')>('@/lib/api'),
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    post: jest.fn(),
    patch: jest.fn(),
    del: jest.fn(),
  },
}));
jest.mock('@/lib/auth', () => ({ useAuth: () => null }));
jest.mock('@/lib/push', () => ({ registerPushToken: jest.fn() }));
jest.mock('@/components/icons', () => ({ Lock: (): null => null }));

jest.mock('@/components/ui', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  const { apiErrorMessage } = jest.requireActual<typeof import('@/lib/api')>('@/lib/api');
  const { useTranslation } = jest.requireActual<typeof import('react-i18next')>('react-i18next');
  const Box = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(RN.View, null, children);
  return {
    Text: ({ children, testID }: { children?: React.ReactNode; testID?: string }) =>
      React.createElement(RN.Text, { testID }, children),
    Screen: Box,
    Card: Box,
    BackButton: () => null,
    Spinner: () => null,
    useApiErrorToast: () => {
      const { t } = useTranslation();
      return (err: unknown) => mockToast(apiErrorMessage(err, t), 'error');
    },
  };
});

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initTestI18n } from '@/test-utils/i18n';
import { FIRST_RENDER_TIMEOUT_MS } from '@/test-utils/timeouts';
import { ApiError } from '@/lib/api';
import type { NotificationPrefs } from '@/lib/notification-prefs';
import NotificationSettingsScreen from '../../../app/(tabs)/account/notifications';

const URL = '/v1/portal/driver/notification-preferences';
const clients: QueryClient[] = [];

const on = { enabled: true, mandatory: false };
const off = { enabled: false, mandatory: false };
const locked = { enabled: true, mandatory: true };

function reply(overrides: Partial<NotificationPrefs> = {}): NotificationPrefs {
  return {
    emailEnabled: true,
    smsEnabled: true,
    pushEnabled: true,
    channels: { email: true, sms: false, push: true },
    events: [
      { eventType: 'session.Started', group: 'sessions', email: on, sms: off, push: on },
      { eventType: 'session.Receipt', group: 'sessions', email: locked, sms: off, push: off },
      { eventType: 'payment.Refunded', group: 'payments', email: on, sms: off, push: on },
    ],
    ...overrides,
  };
}

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
      <NotificationSettingsScreen />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(client.isFetching()).toBe(0));
  return screen;
}

beforeAll(async () => {
  await initTestI18n();
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
});

it(
  'renders a section per group and a switch per configured channel only',
  async () => {
    mockGet.mockResolvedValue(reply());
    const screen = await renderScreen();
    expect(await screen.findByText('Charging Sessions')).toBeTruthy();
    expect(screen.getByText('Payments')).toBeTruthy();
    expect(screen.getByText('Charging started')).toBeTruthy();
    expect(screen.getByText('Session receipt')).toBeTruthy();
    expect(screen.getByTestId('notif-session.Started-email')).toBeTruthy();
    expect(screen.getByTestId('notif-session.Started-push')).toBeTruthy();
    // SMS is not set up by the operator.
    expect(screen.queryByTestId('notif-session.Started-sms')).toBeNull();
    expect(screen.queryByTestId('notif-all-sms')).toBeNull();
    expect(screen.queryByTestId('notif-no-channels')).toBeNull();
    expect(
      screen.getByText(
        'Account and security messages, such as password resets and sign-in codes, are always sent.',
      ),
    ).toBeTruthy();
  },
  FIRST_RENDER_TIMEOUT_MS,
);

it('locks a mandatory cell on and never sends it', async () => {
  mockGet.mockResolvedValue(reply());
  const screen = await renderScreen();
  const cell = await screen.findByTestId('notif-session.Receipt-email');
  expect(cell.props.value).toBe(true);
  expect(cell.props.disabled).toBe(true);
  expect(screen.getByTestId('notif-lock-session.Receipt-email').props.accessibilityLabel).toBe(
    'Required by your operator',
  );
  expect(screen.getByTestId('notif-required-note')).toBeTruthy();
  await fireEvent(cell, 'valueChange', false);
  expect(mockPut).not.toHaveBeenCalled();
});

it('sends only the changed cell', async () => {
  mockGet.mockResolvedValue(reply());
  mockPut.mockResolvedValue(reply());
  const screen = await renderScreen();
  await fireEvent(await screen.findByTestId('notif-payment.Refunded-push'), 'valueChange', false);
  await waitFor(() =>
    expect(mockPut).toHaveBeenCalledWith(URL, {
      events: [{ eventType: 'payment.Refunded', channel: 'push', enabled: false }],
    }),
  );
});

it('turns a whole channel off with the All control, and a mixed one all on', async () => {
  mockGet.mockResolvedValue(reply());
  mockPut.mockResolvedValue(reply());
  const screen = await renderScreen();
  // Email: every optional event is on.
  const allEmail = await screen.findByTestId('notif-all-email');
  expect(allEmail.props.value).toBe(true);
  await fireEvent(allEmail, 'valueChange', false);
  await waitFor(() => expect(mockPut).toHaveBeenCalledWith(URL, { emailEnabled: false }));

  // Push: one optional event off, so the tap turns the off ones on.
  const allPush = screen.getByTestId('notif-all-push');
  expect(allPush.props.accessibilityState.checked).toBe('mixed');
  await fireEvent(allPush, 'valueChange', true);
  await waitFor(() =>
    expect(mockPut).toHaveBeenCalledWith(URL, {
      events: [{ eventType: 'session.Receipt', channel: 'push', enabled: true }],
    }),
  );
});

it('notes when the operator set up neither email nor text messages, and keeps push', async () => {
  mockGet.mockResolvedValue(reply({ channels: { email: false, sms: false, push: true } }));
  const screen = await renderScreen();
  expect(await screen.findByTestId('notif-no-channels')).toBeTruthy();
  expect(
    screen.getByText('Your operator has not set up email or text message notifications yet.'),
  ).toBeTruthy();
  expect(screen.getByTestId('notif-session.Started-push')).toBeTruthy();
  expect(screen.queryByTestId('notif-session.Started-email')).toBeNull();
  // Without mandatory cells on a shown channel there is no lock note.
  expect(screen.queryByTestId('notif-required-note')).toBeNull();
});

it('shows the translated refusal of a mandatory event', async () => {
  mockGet.mockResolvedValue(reply());
  mockPut.mockRejectedValue(new ApiError(400, { code: 'NOTIFICATION_EVENT_MANDATORY' }));
  const screen = await renderScreen();
  await fireEvent(await screen.findByTestId('notif-session.Started-email'), 'valueChange', false);
  await waitFor(() =>
    expect(mockToast).toHaveBeenCalledWith(
      'Your operator requires this notification on this channel, so it cannot be turned off',
      'error',
    ),
  );
});
