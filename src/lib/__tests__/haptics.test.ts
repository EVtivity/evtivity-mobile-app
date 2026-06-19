// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import * as Haptics from 'expo-haptics';
import { tapLight, tapMedium, notifySuccess, notifyError } from '@/lib/haptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

const impactAsync = Haptics.impactAsync as jest.Mock;
const notificationAsync = Haptics.notificationAsync as jest.Mock;

beforeEach(() => {
  impactAsync.mockReset().mockResolvedValue(undefined);
  notificationAsync.mockReset().mockResolvedValue(undefined);
});

describe('haptics wrappers', () => {
  it('tapLight triggers a light impact', () => {
    tapLight();
    expect(impactAsync).toHaveBeenCalledWith('light');
  });
  it('tapMedium triggers a medium impact', () => {
    tapMedium();
    expect(impactAsync).toHaveBeenCalledWith('medium');
  });
  it('notifySuccess triggers a success notification', () => {
    notifySuccess();
    expect(notificationAsync).toHaveBeenCalledWith('success');
  });
  it('notifyError triggers an error notification', () => {
    notifyError();
    expect(notificationAsync).toHaveBeenCalledWith('error');
  });
  it('swallows failures from an unsupported device', async () => {
    impactAsync.mockRejectedValue(new Error('no haptics'));
    notificationAsync.mockRejectedValue(new Error('no haptics'));
    expect(() => {
      tapLight();
      tapMedium();
      notifySuccess();
      notifyError();
    }).not.toThrow();
    await Promise.resolve();
  });
});
