// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { Linking } from 'react-native';
import { openEmail, openPhone } from '@/lib/safe-link';

jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);

const openURL = Linking.openURL as jest.Mock;

beforeEach(() => openURL.mockClear());

describe('openEmail', () => {
  it('opens a mailto url for a valid address', () => {
    expect(openEmail('driver@example.com')).toBe(true);
    expect(openURL).toHaveBeenCalledWith('mailto:driver%40example.com');
  });

  it('trims surrounding whitespace before validating', () => {
    expect(openEmail('  driver@example.com  ')).toBe(true);
    expect(openURL).toHaveBeenCalledWith('mailto:driver%40example.com');
  });

  it.each([null, undefined, '', 'not-an-email', 'a@b', 'spaces in@x.com'])(
    'rejects invalid address %p',
    (value) => {
      expect(openEmail(value)).toBe(false);
      expect(openURL).not.toHaveBeenCalled();
    },
  );
});

describe('openPhone', () => {
  it('opens a tel url for a valid number', () => {
    expect(openPhone('+1 (555) 123-4567')).toBe(true);
    expect(openURL).toHaveBeenCalledWith('tel:%2B1%20(555)%20123-4567');
  });

  it.each([null, undefined, '', 'abc', '12', 'tel:evil'])('rejects invalid number %p', (value) => {
    expect(openPhone(value)).toBe(false);
    expect(openURL).not.toHaveBeenCalled();
  });
});
