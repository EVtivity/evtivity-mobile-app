// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

jest.mock('@/lib/i18n', () => ({ __esModule: true, default: { t: (k: string) => k } }));

import { Alert } from 'react-native';
import { notifyServerUnreachable } from '@/lib/offline-alert';

type AlertButton = { onPress?: () => void };
type AlertOptions = { onDismiss?: () => void };
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

beforeAll(() => jest.useFakeTimers());
afterAll(() => jest.useRealTimers());
beforeEach(() => alertSpy.mockClear());

// These run in order and share the module's dedup state by design.
describe('notifyServerUnreachable', () => {
  it('shows one alert and dedupes while it is visible', () => {
    jest.setSystemTime(100_000);
    notifyServerUnreachable();
    notifyServerUnreachable();
    expect(alertSpy).toHaveBeenCalledTimes(1);
    // Dismiss via the OK button to clear the visible flag.
    const buttons = alertSpy.mock.calls[0]?.[2] as AlertButton[];
    buttons[0]?.onPress?.();
  });

  it('stays quiet inside the cooldown even after dismissal', () => {
    jest.setSystemTime(103_000);
    notifyServerUnreachable();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('shows again past the cooldown and resets on backdrop dismiss', () => {
    jest.setSystemTime(110_000);
    notifyServerUnreachable();
    expect(alertSpy).toHaveBeenCalledTimes(1);
    const options = alertSpy.mock.calls[0]?.[3] as AlertOptions;
    options.onDismiss?.();
    // After dismissal a fresh call past the cooldown shows once more.
    jest.setSystemTime(120_000);
    notifyServerUnreachable();
    expect(alertSpy).toHaveBeenCalledTimes(2);
  });
});
