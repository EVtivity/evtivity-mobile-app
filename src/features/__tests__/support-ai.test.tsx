// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// TC-AI-DR-UI-06: the driver AI support flow of the new case and case screens,
// rendered with the real English catalogue and a mocked API.

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockReplace = jest.fn();
const mockShowApiError = jest.fn();
const mockOpenBrowser = jest.fn();
const mockParams: { current: Record<string, string> } = { current: {} };

jest.mock('@/lib/api', () => {
  class ApiError extends Error {
    readonly status: number;
    readonly body: unknown;
    constructor(statusCode: number, responseBody: unknown) {
      super('api error');
      this.status = statusCode;
      this.body = responseBody;
    }
    get code(): string | undefined {
      return (this.body as { code?: string } | null)?.code;
    }
  }
  return {
    ApiError,
    api: {
      get: (...args: unknown[]) => mockGet(...args),
      post: (...args: unknown[]) => mockPost(...args),
    },
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockParams.current,
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: (...args: unknown[]) => mockOpenBrowser(...args),
}));

jest.mock('@/components/icons', () => {
  const Icon = (): null => null;
  return {
    Check: Icon,
    ChevronDown: Icon,
    ChevronRight: Icon,
    ExternalLink: Icon,
    LifeBuoy: Icon,
    Send: Icon,
  };
});

// The ui barrel pulls in reanimated (no native worklets under jest). Real
// primitives where they render plain views, light stand-ins for the rest.
jest.mock('@/components/ui', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  const { Text } =
    jest.requireActual<typeof import('@/components/ui/Text')>('@/components/ui/Text');
  const Box = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(RN.View, null, children);
  return {
    Text,
    Card: jest.requireActual<typeof import('@/components/ui/Card')>('@/components/ui/Card').Card,
    Badge:
      jest.requireActual<typeof import('@/components/ui/Badge')>('@/components/ui/Badge').Badge,
    Spinner:
      jest.requireActual<typeof import('@/components/ui/Spinner')>('@/components/ui/Spinner')
        .Spinner,
    Screen: Box,
    ScreenBackground: Box,
    Sheet: () => null,
    BackButton: () => null,
    EmptyState: ({ title }: { title: string }) => React.createElement(Text, null, title),
    Button: ({
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
        { testID, onPress, disabled, accessibilityRole: 'button' },
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
    Input: ({
      testID,
      value,
      onChangeText,
      placeholder,
    }: {
      testID?: string;
      value: string;
      onChangeText: (v: string) => void;
      placeholder?: string;
    }) => React.createElement(RN.TextInput, { testID, value, onChangeText, placeholder }),
    useToast: () => ({ show: jest.fn() }),
    useApiErrorToast: () => mockShowApiError,
  };
});

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initTestI18n } from '@/test-utils/i18n';
import { ApiError } from '@/lib/api';
import NewSupportCaseScreen from '../../../app/(tabs)/support/new';
import SupportCaseDetailScreen from '../../../app/(tabs)/support/[id]';
import type { SupportCaseAi, SupportCaseDetail } from '../support';

const FEATURES_ON = {
  reservationEnabled: true,
  supportEnabled: true,
  roamingEnabled: false,
  currency: 'EUR',
  driverAiSupport: true,
  driverAiNoticeVersion: 1,
};
const FEATURES_OFF = { ...FEATURES_ON, driverAiSupport: false };

let features: Record<string, unknown> = FEATURES_ON;
let caseDetail: SupportCaseDetail;

const AI_NONE: SupportCaseAi = {
  consent: 'granted',
  state: 'queued',
  reason: null,
  answeredAt: null,
  feedbackAt: null,
  resolutionSource: null,
  driverActions: [],
};

function detail(ai: Partial<SupportCaseAi>, extra: Partial<SupportCaseDetail> = {}) {
  return {
    id: 'c1',
    caseNumber: 'SC-0001',
    subject: 'Charging stopped',
    status: 'ai_assist',
    category: 'charging_failure',
    priority: 'medium',
    createdAt: '2026-10-11T10:00:00.000Z',
    updatedAt: '2026-10-11T10:00:00.000Z',
    description: 'It stopped after a minute',
    stationId: null,
    stationName: null,
    messages: [
      {
        id: 1,
        senderType: 'driver' as const,
        body: 'It stopped after a minute',
        createdAt: '2026-10-11T10:00:00.000Z',
      },
    ],
    ai: { ...AI_NONE, ...ai },
    ...extra,
  };
}

const ANSWER = {
  id: 2,
  senderType: 'assistant' as const,
  body: 'The connector reported a fault. Try another connector.',
  createdAt: '2026-10-11T10:01:00.000Z',
};

const clients: QueryClient[] = [];

// No retries, and no garbage-collection timers left running after a test.
function renderWithQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  clients.push(client);
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
});

beforeAll(async () => {
  await initTestI18n();
});

beforeEach(() => {
  jest.clearAllMocks();
  features = FEATURES_ON;
  mockParams.current = {};
  mockGet.mockImplementation((path: string) => {
    if (path === '/v1/portal/features') return Promise.resolve(features);
    if (path === '/v1/portal/branding') {
      return Promise.resolve({ portalUrl: 'https://portal.example.com' });
    }
    if (path === '/v1/portal/support-cases/c1') return Promise.resolve(caseDetail);
    return Promise.reject(new Error(`unexpected GET ${path}`));
  });
});

async function fillForm(screen: Awaited<ReturnType<typeof render>>): Promise<void> {
  await fireEvent.changeText(screen.getByTestId('support-subject'), 'Charging stopped');
  await fireEvent.changeText(screen.getByTestId('support-description'), 'It stopped');
}

function postedBody(): Record<string, unknown> {
  expect(mockPost).toHaveBeenCalledTimes(1);
  const [path, body] = mockPost.mock.calls[0] as [string, Record<string, unknown>];
  expect(path).toBe('/v1/portal/support-cases');
  return body;
}

describe('TC-AI-DR-UI-06 new case consent step', () => {
  it('shows the notice and two choices, nothing preselected, when the feature is on', async () => {
    const screen = await renderWithQuery(<NewSupportCaseScreen />);
    expect(await screen.findByTestId('support-ai-consent')).toBeTruthy();
    expect(screen.getByText('How should we handle your request?')).toBeTruthy();
    expect(screen.getByText('About the AI analysis')).toBeTruthy();
    expect(screen.getByText('What the AI provider receives')).toBeTruthy();
    expect(screen.getByTestId('support-ai-choice-ai')).toBeTruthy();
    expect(screen.getByTestId('support-ai-choice-team')).toBeTruthy();
    // No form, and so no way to send, until the driver chooses.
    expect(screen.queryByTestId('support-subject')).toBeNull();
    expect(screen.queryByTestId('support-submit')).toBeNull();
    expect(screen.queryByTestId('support-ai-choice')).toBeNull();
  });

  it('discloses what the AI reads and links the privacy policy', async () => {
    const screen = await renderWithQuery(<NewSupportCaseScreen />);
    await screen.findByTestId('support-ai-consent');
    expect(screen.queryByTestId('support-ai-reads')).toBeNull();
    await fireEvent.press(screen.getByTestId('support-ai-reads-toggle'));
    expect(screen.getByText(/Your last 10 charging sessions/)).toBeTruthy();
    await fireEvent.press(await screen.findByTestId('support-ai-privacy'));
    expect(mockOpenBrowser).toHaveBeenCalledWith('https://portal.example.com/privacy-policy');
  });

  it.each([
    ['support-ai-choice-ai', 'granted'],
    ['support-ai-choice-team', 'declined'],
  ])('sends aiConsent only after a press (%s -> %s)', async (button, decision) => {
    mockPost.mockResolvedValue({ id: 'c1' });
    const screen = await renderWithQuery(<NewSupportCaseScreen />);
    await fireEvent.press(await screen.findByTestId(button));
    await fillForm(screen);
    await fireEvent.press(screen.getByTestId('support-submit'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(postedBody().aiConsent).toEqual({ decision, noticeVersion: 1, language: 'en' });
  });

  it('lets the driver go back and change the choice', async () => {
    mockPost.mockResolvedValue({ id: 'c1' });
    const screen = await renderWithQuery(<NewSupportCaseScreen />);
    await fireEvent.press(await screen.findByTestId('support-ai-choice-ai'));
    expect(screen.getByText('Let an AI analyze my issue first')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('support-ai-change'));
    expect(screen.getByTestId('support-ai-consent')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('support-ai-choice-team'));
    await fillForm(screen);
    await fireEvent.press(screen.getByTestId('support-submit'));
    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    expect(postedBody().aiConsent).toMatchObject({ decision: 'declined' });
  });

  it('shows the unchanged form and sends no aiConsent when the feature is off', async () => {
    features = FEATURES_OFF;
    mockPost.mockResolvedValue({ id: 'c1' });
    const screen = await renderWithQuery(<NewSupportCaseScreen />);
    expect(await screen.findByTestId('support-subject')).toBeTruthy();
    expect(screen.queryByTestId('support-ai-consent')).toBeNull();
    await fillForm(screen);
    await fireEvent.press(screen.getByTestId('support-submit'));
    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    expect(postedBody()).not.toHaveProperty('aiConsent');
  });

  it('treats a notice version without app text as the feature off', async () => {
    features = { ...FEATURES_ON, driverAiNoticeVersion: 2 };
    const screen = await renderWithQuery(<NewSupportCaseScreen />);
    expect(await screen.findByTestId('support-subject')).toBeTruthy();
    expect(screen.queryByTestId('support-ai-consent')).toBeNull();
  });

  it('shows the error, refetches the features and asks again on DRIVER_AI_NOTICE_OUTDATED', async () => {
    const outdated = new ApiError(409, { code: 'DRIVER_AI_NOTICE_OUTDATED' });
    mockPost.mockRejectedValue(outdated);
    const screen = await renderWithQuery(<NewSupportCaseScreen />);
    await fireEvent.press(await screen.findByTestId('support-ai-choice-ai'));
    await fillForm(screen);
    const featureCalls = mockGet.mock.calls.filter((c) => c[0] === '/v1/portal/features').length;
    await fireEvent.press(screen.getByTestId('support-submit'));
    await waitFor(() => expect(mockShowApiError).toHaveBeenCalledWith(outdated));
    await waitFor(() =>
      expect(mockGet.mock.calls.filter((c) => c[0] === '/v1/portal/features').length).toBe(
        featureCalls + 1,
      ),
    );
    expect(await screen.findByTestId('support-ai-consent')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('TC-AI-DR-UI-06 case screen AI step', () => {
  beforeEach(() => {
    mockParams.current = { id: 'c1' };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows the analyzing state as a live region and the answer once the poll brings it', async () => {
    jest.useFakeTimers();
    caseDetail = detail({ state: 'queued' });
    const screen = await renderWithQuery(<SupportCaseDetailScreen />);
    expect(await screen.findByText('Analyzing your issue')).toBeTruthy();
    const live = screen.getByTestId('support-ai-live');
    expect(live.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByText('Automatic answer')).toBeTruthy(); // status badge ai_assist

    caseDetail = detail({ state: 'analyzing' });
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });
    expect(screen.getByText('Analyzing your issue')).toBeTruthy();

    caseDetail = detail(
      { state: 'awaiting_feedback', driverActions: ['try_other_connector', 'unknown_code'] },
      { messages: [...detail({}).messages, ANSWER] },
    );
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });
    expect(await screen.findByTestId('support-ai-answer')).toBeTruthy();
    expect(screen.queryByText('Analyzing your issue')).toBeNull();
  });

  it('labels the automatic answer and shows the driver action chips', async () => {
    caseDetail = detail(
      {
        state: 'awaiting_feedback',
        driverActions: ['try_other_connector', 'check_payment_method', 'unknown_code'],
      },
      { messages: [...detail({}).messages, ANSWER] },
    );
    const screen = await renderWithQuery(<SupportCaseDetailScreen />);
    const answer = await screen.findByTestId('support-ai-answer');
    expect(answer).toBeTruthy();
    expect(screen.getByText(ANSWER.body)).toBeTruthy();
    expect(screen.getByText('Try another connector')).toBeTruthy();
    expect(screen.getByText('Check the payment method')).toBeTruthy();
    expect(screen.queryByTestId('support-ai-action-unknown_code')).toBeNull();
    expect(screen.getByText('Did this solve your issue?')).toBeTruthy();
    expect(
      screen.getByText('We will pass this to the support team if you choose No.'),
    ).toBeTruthy();
  });

  it.each([
    ['support-ai-feedback-yes', true],
    ['support-ai-feedback-no', false],
  ])('%s calls the feedback route with satisfied %s', async (button, satisfied) => {
    caseDetail = detail(
      { state: 'awaiting_feedback' },
      { messages: [...detail({}).messages, ANSWER] },
    );
    mockPost.mockResolvedValue({ id: 'c1', status: 'resolved', ai: caseDetail.ai });
    const screen = await renderWithQuery(<SupportCaseDetailScreen />);
    await fireEvent.press(await screen.findByTestId(button));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/v1/portal/support-cases/c1/ai-feedback', {
        satisfied,
      }),
    );
  });

  it('shows the failure text and reloads the case when the feedback fails', async () => {
    caseDetail = detail(
      { state: 'awaiting_feedback' },
      { messages: [...detail({}).messages, ANSWER] },
    );
    mockPost.mockRejectedValue(
      new ApiError(409, { code: 'SUPPORT_CASE_AI_NOT_AWAITING_FEEDBACK' }),
    );
    const screen = await renderWithQuery(<SupportCaseDetailScreen />);
    await screen.findByTestId('support-ai-feedback-yes');
    const caseCalls = mockGet.mock.calls.filter(
      (c) => c[0] === '/v1/portal/support-cases/c1',
    ).length;
    await fireEvent.press(screen.getByTestId('support-ai-feedback-yes'));
    expect(await screen.findByText('Your answer could not be sent. Try again.')).toBeTruthy();
    await waitFor(() =>
      expect(
        mockGet.mock.calls.filter((c) => c[0] === '/v1/portal/support-cases/c1').length,
      ).toBeGreaterThan(caseCalls),
    );
    expect(screen.queryByText(/SUPPORT_CASE_AI_NOT_AWAITING_FEEDBACK/)).toBeNull();
  });

  it.each([
    ['resolved_by_ai', 'resolved', 'Resolved. You can reopen it by writing to us.'],
    ['escalated', 'open', 'Sent to the support team.'],
    ['failed', 'open', 'We sent your request to the support team.'],
    ['skipped', 'open', 'We sent your request to the support team.'],
  ] as const)('shows the %s end state', async (state, status, text) => {
    caseDetail = detail(
      {
        state,
        reason: state === 'failed' ? 'provider_error' : null,
        resolutionSource: state === 'resolved_by_ai' ? 'ai' : null,
      },
      { status },
    );
    const screen = await renderWithQuery(<SupportCaseDetailScreen />);
    expect(await screen.findByText(text)).toBeTruthy();
    expect(screen.queryByText('Analyzing your issue')).toBeNull();
    expect(screen.queryByTestId('support-ai-feedback')).toBeNull();
    expect(screen.queryByText(/provider_error/)).toBeNull();
    // The composer stays: a case the AI resolved can be reopened by writing.
    expect(screen.getByPlaceholderText('Message')).toBeTruthy();
  });

  it('keeps the composer usable while the AI step is open', async () => {
    caseDetail = detail({ state: 'analyzing' });
    const screen = await renderWithQuery(<SupportCaseDetailScreen />);
    await screen.findByText('Analyzing your issue');
    expect(screen.getByPlaceholderText('Message')).toBeTruthy();
  });

  it('shows no AI step on a case the driver sent to the team', async () => {
    caseDetail = detail({ consent: 'declined', state: null }, { status: 'open' });
    const screen = await renderWithQuery(<SupportCaseDetailScreen />);
    await screen.findByText('Charging stopped');
    expect(screen.queryByTestId('support-ai-status')).toBeNull();
  });
});
