// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The avatar component: an uploaded photo is never cached (a removed photo
// does not come back), and generated options off the allow-list show initials.

import React from 'react';
import { render } from '@testing-library/react-native';
import { initTestI18n } from '@/test-utils/i18n';

jest.mock('expo-image', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Image: (props: { cachePolicy?: string; source: { uri: string } }) =>
      ReactActual.createElement(RN.View, {
        testID: 'avatar-image',
        accessibilityHint: `${props.cachePolicy ?? 'default'} ${props.source.uri}`,
      }),
  };
});
jest.mock('react-native-svg', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SvgXml: () => ReactActual.createElement(RN.View, { testID: 'avatar-svg' }),
  };
});

jest.mock('@/components/ui', () => ({
  Text: jest.requireActual<typeof import('@/components/ui/Text')>('@/components/ui/Text').Text,
}));

import { DriverAvatar } from '@/components/DriverAvatar';

beforeAll(async () => {
  await initTestI18n();
});

describe('DriverAvatar', () => {
  it('loads an uploaded photo without the image cache (I2)', async () => {
    const screen = await render(
      <DriverAvatar avatar={{ kind: 'image', url: 'https://s3.example/a.jpg' }} firstName="Ana" />,
    );
    expect(screen.getByTestId('avatar-image').props.accessibilityHint).toBe(
      'none https://s3.example/a.jpg',
    );
  });

  it('renders allow-listed options and shows initials for any other (I3)', async () => {
    const valid = await render(
      <DriverAvatar
        avatar={{
          kind: 'generated',
          style: 'avataaars',
          seed: 'abc',
          options: { topVariant: 'bob' },
        }}
        firstName="Ana"
        lastName="Lee"
      />,
    );
    expect(valid.getByTestId('avatar-svg')).toBeTruthy();
    valid.unmount();

    const invalid = await render(
      <DriverAvatar
        avatar={{
          kind: 'generated',
          style: 'avataaars',
          seed: 'abc',
          options: { topVariant: 'not-a-variant' },
        }}
        firstName="Ana"
        lastName="Lee"
      />,
    );
    expect(invalid.queryByTestId('avatar-svg')).toBeNull();
    expect(invalid.getByText('AL')).toBeTruthy();
  });
});
