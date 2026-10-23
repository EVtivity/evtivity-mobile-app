// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// A refusal that names the driver portal (portalUrl) shows its message with an
// "Open Portal" action; every other error stays a toast.

const mockToast = jest.fn();
const mockConfirm = jest.fn(async () => true);
const mockOpen = jest.fn(async () => ({ type: 'opened' }));

jest.mock('@/components/ui/Toast', () => ({ useToast: () => ({ show: mockToast }) }));
jest.mock('@/components/ui/ConfirmDialog', () => ({ useConfirm: () => mockConfirm }));
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: (...args: unknown[]) => mockOpen(...(args as [])),
}));

import { act, renderHook } from '@testing-library/react-native';
import { initTestI18n } from '@/test-utils/i18n';
import { ApiError } from '@/lib/api';
import { useApiErrorToast } from '@/components/ui/useApiErrorToast';
import { usePortalNotice } from '@/components/ui/usePortalNotice';

const PORTAL_REFUSAL = new ApiError(400, {
  error: 'Turn off two-factor authentication in the driver portal at https://portal.test',
  code: 'VALIDATION_ERROR',
  portalUrl: 'https://portal.test',
});

beforeAll(async () => {
  await initTestI18n();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useApiErrorToast', () => {
  it('offers the portal page for a refusal with a portalUrl', async () => {
    const { result } = await renderHook(() => useApiErrorToast());
    await act(async () => {
      result.current(PORTAL_REFUSAL, { portalPath: '/account/security' });
    });
    // The app's own text, never the server's English message.
    expect(mockConfirm).toHaveBeenCalledWith({
      title: 'Continue in the Driver Portal',
      message: 'This change is made in the driver portal.',
      confirmText: 'Open Portal',
      cancelText: 'Close',
    });
    expect(mockOpen).toHaveBeenCalledWith('https://portal.test/account/security');
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('uses the reason the screen passes', async () => {
    const { result } = await renderHook(() => useApiErrorToast());
    await act(async () => {
      result.current(PORTAL_REFUSAL, { portalMessage: 'Screen reason' });
    });
    expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({ message: 'Screen reason' }));
  });

  it('opens the portal home without a page', async () => {
    const { result } = await renderHook(() => useApiErrorToast());
    await act(async () => {
      result.current(PORTAL_REFUSAL);
    });
    expect(mockOpen).toHaveBeenCalledWith('https://portal.test/');
  });

  it('shows any other error as a toast', async () => {
    const { result } = await renderHook(() => useApiErrorToast());
    await act(async () => {
      result.current(new ApiError(409, { code: 'TOKEN_DUPLICATE' }));
    });
    expect(mockToast).toHaveBeenCalledWith('Token already registered', 'error');
    expect(mockConfirm).not.toHaveBeenCalled();
  });
});

describe('usePortalNotice', () => {
  it('opens nothing when the driver closes the dialog', async () => {
    mockConfirm.mockResolvedValueOnce(false);
    const { result } = await renderHook(() => usePortalNotice());
    await act(async () => {
      await result.current('Use the portal', 'https://portal.test/account/security');
    });
    expect(mockOpen).not.toHaveBeenCalled();
  });

  it('shows the message as a toast when no portal URL is known', async () => {
    const { result } = await renderHook(() => usePortalNotice());
    await act(async () => {
      await result.current('Use the portal', null);
    });
    expect(mockToast).toHaveBeenCalledWith('Use the portal', 'error');
    expect(mockConfirm).not.toHaveBeenCalled();
  });
});
