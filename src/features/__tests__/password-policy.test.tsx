// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The live password policy from GET /v1/security/public, with the default
// rules for an older server or a failed request, and the WEAK_PASSWORD reply
// reader that reloads it.

const mockGet = jest.fn();

jest.mock('@/lib/api', () => {
  const actual = jest.requireActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, api: { get: (...args: unknown[]) => mockGet(...args) } };
});

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';
import { DEFAULT_PASSWORD_POLICY } from '@/lib/password-policy';
import {
  SECURITY_PUBLIC_QUERY_KEY,
  usePasswordPolicy,
  useWeakPasswordReply,
  weakPasswordMissing,
} from '@/features/password-policy';

function setup(): {
  client: QueryClient;
  wrapper: (p: { children: React.ReactNode }) => React.JSX.Element;
} {
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

const LIVE = {
  minLength: 16,
  requireUppercase: false,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: true,
};

beforeEach(() => {
  mockGet.mockReset();
});

describe('usePasswordPolicy', () => {
  it('reads the policy from the public security endpoint', async () => {
    mockGet.mockResolvedValue({ recaptchaEnabled: false, passwordPolicy: LIVE });
    const { wrapper } = setup();
    const { result } = await renderHook(() => usePasswordPolicy(), { wrapper });
    await waitFor(() => expect(result.current).toEqual(LIVE));
    expect(mockGet).toHaveBeenCalledWith('/v1/security/public');
  });

  it('uses the default rules for an older server without passwordPolicy', async () => {
    mockGet.mockResolvedValue({ recaptchaEnabled: false });
    const { client, wrapper } = setup();
    const { result } = await renderHook(() => usePasswordPolicy(), { wrapper });
    await waitFor(() =>
      expect(client.getQueryState(SECURITY_PUBLIC_QUERY_KEY)?.status).toBe('success'),
    );
    expect(result.current).toEqual(DEFAULT_PASSWORD_POLICY);
  });

  it('uses the default rules while loading and when the request fails', async () => {
    mockGet.mockRejectedValue(new ApiError(500, {}));
    const { client, wrapper } = setup();
    const { result } = await renderHook(() => usePasswordPolicy(), { wrapper });
    expect(result.current).toEqual(DEFAULT_PASSWORD_POLICY);
    await waitFor(() =>
      expect(client.getQueryState(SECURITY_PUBLIC_QUERY_KEY)?.status).toBe('error'),
    );
    expect(result.current).toEqual(DEFAULT_PASSWORD_POLICY);
  });
});

describe('weakPasswordMissing', () => {
  it('returns the known rules of a WEAK_PASSWORD reply in display order', () => {
    const err = new ApiError(400, { code: 'WEAK_PASSWORD', missing: ['symbol', 'minLength', 'x'] });
    expect(weakPasswordMissing(err)).toEqual(['minLength', 'symbol']);
    expect(weakPasswordMissing(new ApiError(400, { code: 'WEAK_PASSWORD' }))).toEqual([]);
  });

  it('returns null for any other error', () => {
    expect(weakPasswordMissing(new ApiError(400, { code: 'VALIDATION_ERROR' }))).toBeNull();
    expect(weakPasswordMissing(new Error('offline'))).toBeNull();
  });
});

describe('useWeakPasswordReply', () => {
  it('reloads the policy on a WEAK_PASSWORD reply only', async () => {
    const { client, wrapper } = setup();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => useWeakPasswordReply(), { wrapper });
    let missing: unknown;
    await act(async () => {
      missing = result.current(new ApiError(400, { code: 'WEAK_PASSWORD', missing: ['symbol'] }));
    });
    expect(missing).toEqual(['symbol']);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: SECURITY_PUBLIC_QUERY_KEY });
    invalidate.mockClear();
    await act(async () => {
      missing = result.current(new ApiError(409, { code: 'EMAIL_EXISTS' }));
    });
    expect(missing).toBeNull();
    expect(invalidate).not.toHaveBeenCalled();
  });
});
