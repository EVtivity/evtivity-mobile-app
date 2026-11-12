// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Favorites and Notify Me When Free per unit (charger box): a unit sends its
// unitId, the whole station sends exactly the requests the app sent before.

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockDel = jest.fn();

jest.mock('@/lib/api', () => ({
  ...jest.requireActual<typeof import('@/lib/api')>('@/lib/api'),
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    del: (...args: unknown[]) => mockDel(...args),
  },
}));

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useIsFavorite, useToggleFavorite } from '@/features/favorites';
import { useIsWatching, useToggleWatch } from '@/features/station-watch';

function wrapper(): {
  client: QueryClient;
  Wrapper: (p: { children: React.ReactNode }) => React.JSX.Element;
} {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, Wrapper };
}

beforeEach(() => {
  mockGet.mockReset().mockResolvedValue({ isFavorite: false, favoriteId: null });
  mockPost.mockReset().mockResolvedValue({});
  mockDel.mockReset().mockResolvedValue({});
});

describe('favorites per unit', () => {
  it('checks the whole station with the request it sent before', async () => {
    const { Wrapper } = wrapper();
    const { result } = await renderHook(() => useIsFavorite('CS 1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/v1/portal/favorites/check/CS%201');
  });

  it('checks one unit with its unitId', async () => {
    const { Wrapper } = wrapper();
    const { result } = await renderHook(() => useIsFavorite('CS-1', 'unt_1'), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/v1/portal/favorites/check/CS-1?unitId=unt_1');
  });

  it('adds a station favorite without a unit and a unit favorite with it', async () => {
    const { Wrapper } = wrapper();
    const { result } = await renderHook(() => useToggleFavorite(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ stationId: 'CS-1', favoriteId: null, isFavorited: false });
    });
    expect(mockPost).toHaveBeenLastCalledWith('/v1/portal/favorites', { stationId: 'CS-1' });
    await act(async () => {
      await result.current.mutateAsync({
        stationId: 'CS-1',
        unitId: null,
        favoriteId: null,
        isFavorited: false,
      });
    });
    expect(mockPost).toHaveBeenLastCalledWith('/v1/portal/favorites', { stationId: 'CS-1' });
    await act(async () => {
      await result.current.mutateAsync({
        stationId: 'CS-1',
        unitId: 'unt_2',
        favoriteId: null,
        isFavorited: false,
      });
    });
    expect(mockPost).toHaveBeenLastCalledWith('/v1/portal/favorites', {
      stationId: 'CS-1',
      unitId: 'unt_2',
    });
  });

  it('removes a unit favorite by its record id and refreshes the unit check', async () => {
    const { client, Wrapper } = wrapper();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => useToggleFavorite(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        stationId: 'CS-1',
        unitId: 'unt_2',
        favoriteId: 7,
        isFavorited: true,
      });
    });
    expect(mockDel).toHaveBeenCalledWith('/v1/portal/favorites/7');
    // The station key is a prefix of every unit check key of the station.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['favorites', 'check', 'CS-1'] });
  });
});

describe('watches per unit', () => {
  it('checks the whole station as before and one unit with its unitId', async () => {
    mockGet.mockResolvedValue({ isWatching: false, watchId: null });
    const { Wrapper } = wrapper();
    const station = await renderHook(() => useIsWatching('CS-1'), { wrapper: Wrapper });
    await waitFor(() => expect(station.result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/v1/portal/station-watches/check/CS-1');
    const unit = await renderHook(() => useIsWatching('CS-1', 'unt_1'), { wrapper: Wrapper });
    await waitFor(() => expect(unit.result.current.isSuccess).toBe(true));
    expect(mockGet).toHaveBeenCalledWith('/v1/portal/station-watches/check/CS-1?unitId=unt_1');
  });

  it('watches the station without a unit and a unit with it', async () => {
    const { Wrapper } = wrapper();
    const { result } = await renderHook(() => useToggleWatch(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ stationId: 'CS-1', watchId: null, isWatching: false });
    });
    expect(mockPost).toHaveBeenLastCalledWith('/v1/portal/station-watches', {
      stationId: 'CS-1',
    });
    await act(async () => {
      await result.current.mutateAsync({
        stationId: 'CS-1',
        unitId: 'unt_1',
        watchId: null,
        isWatching: false,
      });
    });
    expect(mockPost).toHaveBeenLastCalledWith('/v1/portal/station-watches', {
      stationId: 'CS-1',
      unitId: 'unt_1',
    });
    await act(async () => {
      await result.current.mutateAsync({
        stationId: 'CS-1',
        unitId: 'unt_1',
        watchId: 4,
        isWatching: true,
      });
    });
    expect(mockDel).toHaveBeenCalledWith('/v1/portal/station-watches/4');
  });
});
