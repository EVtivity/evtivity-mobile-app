// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface CheckWatchResult {
  isWatching: boolean;
  watchId: number | null;
}

export interface WatchStation {
  id: number;
  stationId: string;
  siteName: string | null;
  siteAddress: string | null;
  siteCity: string | null;
  siteState: string | null;
  isOnline: boolean;
  evseCount: number;
  availableCount: number;
}

export function useWatches() {
  return useQuery({
    queryKey: ['station-watches'],
    queryFn: () => api.get<WatchStation[]>('/v1/portal/station-watches'),
  });
}

export function useIsWatching(stationId: string) {
  return useQuery({
    queryKey: ['station-watch', 'check', stationId],
    queryFn: () =>
      api.get<CheckWatchResult>(
        `/v1/portal/station-watches/check/${encodeURIComponent(stationId)}`,
      ),
    enabled: stationId.length > 0,
  });
}

// Start watching when not watching (POST by OCPP stationId), stop when watching
// (DELETE by the watch record id, which the caller already holds).
export function useToggleWatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      stationId: string;
      watchId: number | null;
      isWatching: boolean;
    }): Promise<void> => {
      if (input.isWatching) {
        if (input.watchId == null) throw new Error('Missing watch id');
        await api.del(`/v1/portal/station-watches/${String(input.watchId)}`);
        return;
      }
      await api.post('/v1/portal/station-watches', { stationId: input.stationId });
    },
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: ['station-watch', 'check', input.stationId] });
      void qc.invalidateQueries({ queryKey: ['station-watches'] });
    },
  });
}
