// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { useCallback, useState } from 'react';

// Drives a Screen's pull-to-refresh control. `refreshing` is true ONLY while a
// user-initiated pull is in flight, never during background polling
// (refetchInterval) or refocus refetches. Binding the control to a query's
// `isRefetching` instead makes the top spinner flash on every poll.
export function usePullToRefresh(refetch: () => Promise<unknown>): {
  refreshing: boolean;
  onRefresh: () => void;
} {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void refetch().finally(() => setRefreshing(false));
  }, [refetch]);
  return { refreshing, onRefresh };
}
