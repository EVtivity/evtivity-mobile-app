// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePullToRefresh } from '@/lib/use-pull-to-refresh';

describe('usePullToRefresh', () => {
  it('toggles refreshing around the refetch promise', async () => {
    let resolve: () => void = () => undefined;
    const refetch = jest.fn(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    );
    const { result } = renderHook(() => usePullToRefresh(refetch));
    expect(result.current.refreshing).toBe(false);

    act(() => result.current.onRefresh());
    expect(result.current.refreshing).toBe(true);
    expect(refetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolve();
    });
    await waitFor(() => expect(result.current.refreshing).toBe(false));
  });
});
