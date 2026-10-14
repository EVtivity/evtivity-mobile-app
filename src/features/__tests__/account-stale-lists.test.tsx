// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// A refused card or vehicle change means the cached list is stale: 404 for a
// card or vehicle that is not the driver's, 403 TOKEN_BLOCKED_BY_OPERATOR for
// a card the operator deactivated. Each one refetches its list.

const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockDel = jest.fn();

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    del: (...args: unknown[]) => mockDel(...args),
  },
}));
jest.mock('@/lib/auth', () => ({ useAuth: () => null }));

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAddRfidToken, useDeleteVehicle, useToggleRfidToken } from '@/features/account';

function setup(): {
  client: QueryClient;
  invalidate: jest.SpyInstance;
  wrapper: (p: { children: React.ReactNode }) => React.JSX.Element;
} {
  // gcTime Infinity: no garbage collection timer keeps jest running.
  const client = new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, invalidate, wrapper };
}

const blocked = Object.assign(new Error('blocked'), { code: 'TOKEN_BLOCKED_BY_OPERATOR' });
const notFound = Object.assign(new Error('not found'), { code: 'TOKEN_NOT_FOUND' });

beforeEach(() => {
  jest.clearAllMocks();
});

it('refetches the cards when a toggle is refused', async () => {
  mockPatch.mockRejectedValue(blocked);
  const { invalidate, wrapper } = setup();
  const { result } = await renderHook(() => useToggleRfidToken(), { wrapper });
  await act(async () => {
    result.current.mutate({ id: 't1', isActive: true });
  });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['rfid-tokens'] });
});

it('writes an accepted toggle into the cache without a refetch', async () => {
  const updated = { id: 't1', idToken: 'ABCD1234', tokenType: 'ISO14443', isActive: false };
  mockPatch.mockResolvedValue(updated);
  const { client, invalidate, wrapper } = setup();
  client.setQueryData(['rfid-tokens'], [{ ...updated, isActive: true }]);
  const { result } = await renderHook(() => useToggleRfidToken(), { wrapper });
  await act(async () => {
    result.current.mutate({ id: 't1', isActive: false });
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(client.getQueryData(['rfid-tokens'])).toEqual([updated]);
  expect(invalidate).not.toHaveBeenCalled();
});

it('refetches the cards when re-adding a blocked card is refused', async () => {
  mockPost.mockRejectedValue(blocked);
  const { invalidate, wrapper } = setup();
  const { result } = await renderHook(() => useAddRfidToken(), { wrapper });
  await act(async () => {
    result.current.mutate({ idToken: 'ABCD1234' });
  });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['rfid-tokens'] });
});

it('refetches the vehicles when a delete answers 404', async () => {
  mockDel.mockRejectedValue(notFound);
  const { invalidate, wrapper } = setup();
  const { result } = await renderHook(() => useDeleteVehicle(), { wrapper });
  await act(async () => {
    result.current.mutate('v1');
  });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['vehicles'] });
});
