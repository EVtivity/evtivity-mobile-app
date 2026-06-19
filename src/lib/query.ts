// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { QueryClient, QueryCache, MutationCache, focusManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';
import { ApiError } from './api';
import { notifyServerUnreachable } from './offline-alert';

// Pause polling (refetchInterval) and background work when the app is not in the
// foreground. React Query treats "focused" as "active app", so this stops every
// interval the moment the user backgrounds the app, saving battery and data.
AppState.addEventListener('change', (status: AppStateStatus) => {
  focusManager.setFocused(status === 'active');
});

// One friendly popup whenever a request fails because the server is unreachable
// (network down or 5xx), instead of a raw error surfacing per call.
function onAnyError(error: unknown): void {
  if (error instanceof ApiError && error.isServerDown) notifyServerUnreachable();
}

// Do not retry auth/permission failures; they will not succeed on retry. Retry
// transient network/server errors twice.
export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: onAnyError }),
  mutationCache: new MutationCache({ onError: onAnyError }),
  defaultOptions: {
    queries: {
      // Stable lists (vehicles, tokens, payment methods, favorites) rarely
      // change; mutations invalidate explicitly, so a 60s baseline avoids
      // refetch-on-every-mount across tab switches. Hot data sets its own.
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && [400, 401, 403, 404, 409].includes(error.status)) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
