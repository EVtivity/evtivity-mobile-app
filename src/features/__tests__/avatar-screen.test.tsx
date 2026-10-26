// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The avatar screen: pickers, Random and Save of a generated avatar, the upload
// with its size check before any request, and Remove, with the real English
// catalogue and a mocked API.

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDel = jest.fn();
const mockToast = jest.fn();
const mockPick = jest.fn();

jest.mock('@/lib/api', () => ({
  ...jest.requireActual<typeof import('@/lib/api')>('@/lib/api'),
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
    del: (...args: unknown[]) => mockDel(...args),
  },
}));

jest.mock('@/lib/auth', () => ({
  useAuth: (select: (s: unknown) => unknown) =>
    select({ driver: { firstName: 'Ana', lastName: 'Lee' } }),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...args: unknown[]) => mockPick(...args),
}));
jest.mock('expo-file-system', () => ({
  File: class {
    size = null;
  },
}));
jest.mock('expo-image', () => {
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  return { Image: RN.View };
});
jest.mock('react-native-svg', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SvgXml: ({ xml }: { xml: string }) =>
      React.createElement(RN.View, { testID: 'avatar-svg', accessibilityHint: xml }),
  };
});

jest.mock('@/components/ui', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  const { Text } =
    jest.requireActual<typeof import('@/components/ui/Text')>('@/components/ui/Text');
  const Box = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(RN.View, null, children);
  const Button = ({
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
    );
  return {
    Text,
    Screen: Box,
    BackButton: () => null,
    Button,
    Segmented: ({
      segments,
      onChange,
    }: {
      segments: { value: string; label: string }[];
      onChange: (v: string) => void;
    }) =>
      React.createElement(
        RN.View,
        null,
        segments.map((s) =>
          React.createElement(Button, {
            key: s.value,
            title: s.label,
            testID: `segment-${s.value}`,
            onPress: () => onChange(s.value),
          }),
        ),
      ),
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
          React.createElement(Button, {
            key: o.value,
            title: o.label,
            testID: `chip-${o.value}`,
            onPress: () => onSelect(o.value),
          }),
        ),
      ),
    useToast: () => ({ show: mockToast }),
    useApiErrorToast: () => (err: unknown) => mockToast(String(err), 'error'),
    useConfirm: () => () => Promise.resolve(true),
  };
});

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initTestI18n } from '@/test-utils/i18n';
import AvatarScreen from '../../../app/(tabs)/account/avatar';

const GENERATED = {
  kind: 'generated',
  style: 'avataaars',
  seed: 'abc',
  options: { topVariant: 'bob', skinColor: '614335', accessoriesProbability: 0 },
};

let avatar: unknown = null;
let features: Record<string, unknown> = {};
const clients: QueryClient[] = [];

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
      <AvatarScreen />
    </QueryClientProvider>,
  );
  await waitFor(() => expect(client.isFetching()).toBe(0));
  return screen;
}

beforeAll(async () => {
  await initTestI18n();
});

afterEach(() => {
  for (const client of clients.splice(0)) client.clear();
});

beforeEach(() => {
  jest.clearAllMocks();
  avatar = GENERATED;
  features = { avatarUploadEnabled: true };
  mockGet.mockImplementation((path: string) => {
    if (path === '/v1/portal/driver/avatar') return Promise.resolve({ avatar });
    if (path === '/v1/portal/features') return Promise.resolve(features);
    return Promise.reject(new Error(`unexpected GET ${path}`));
  });
  mockPut.mockImplementation((_path: string, body: object) =>
    Promise.resolve({ avatar: { kind: 'generated', ...body } }),
  );
  mockDel.mockResolvedValue({ avatar: null });
});

describe('Avatar screen', () => {
  it('saves the saved avatar with a changed option', async () => {
    const screen = await renderScreen();
    await screen.findByTestId('avatar-remove');
    await fireEvent.press(screen.getByTestId('chip-frizzle'));
    await fireEvent.press(screen.getByTestId('avatar-save'));
    await waitFor(() => expect(mockPut).toHaveBeenCalled());
    expect(mockPut.mock.calls[0]?.[0]).toBe('/v1/portal/driver/avatar');
    expect(mockPut.mock.calls[0]?.[1]).toMatchObject({
      style: 'avataaars',
      seed: 'abc',
      options: { topVariant: 'frizzle', skinColor: '614335' },
    });
    expect(mockToast).toHaveBeenCalledWith('Avatar saved.', 'success');
  });

  it('Random changes the preview', async () => {
    const screen = await renderScreen();
    await screen.findByTestId('avatar-remove');
    const before = screen.getByTestId('avatar-svg').props.accessibilityHint as string;
    await fireEvent.press(screen.getByTestId('avatar-random'));
    await waitFor(() =>
      expect(screen.getByTestId('avatar-svg').props.accessibilityHint).not.toBe(before),
    );
  });

  it('refuses an image of 1 MB or more before any request', async () => {
    const screen = await renderScreen();
    await fireEvent.press(await screen.findByTestId('segment-upload'));
    mockPick.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///a.jpg', mimeType: 'image/jpeg', fileSize: 1024 * 1024 }],
    });
    await fireEvent.press(screen.getByTestId('avatar-choose-image'));
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith('The image must be smaller than 1 MB.', 'error'),
    );
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('hides the upload without file storage', async () => {
    features = { avatarUploadEnabled: false };
    const screen = await renderScreen();
    expect(screen.queryByTestId('segment-upload')).toBeNull();
  });

  it('removes the avatar after the confirmation', async () => {
    const screen = await renderScreen();
    await fireEvent.press(await screen.findByTestId('avatar-remove'));
    await waitFor(() => expect(mockDel).toHaveBeenCalledWith('/v1/portal/driver/avatar'));
  });
});
