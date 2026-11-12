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
  // The watched unit (charger box) of a station with units; null for a watch
  // of the whole station. A unit watch fires only for an EVSE of that unit.
  unitId?: string | null;
  unitName?: string | null;
  siteName: string | null;
  siteAddress: string | null;
  siteCity: string | null;
  siteState: string | null;
  isOnline: boolean;
  evseCount: number;
  availableCount: number;
}

// The check query key: the station key as before, with the unit added for a
// unit watch, so invalidating the station key covers its units too.
function checkKey(stationId: string, unitId: string | null | undefined): readonly unknown[] {
  return unitId != null
    ? ['station-watch', 'check', stationId, unitId]
    : ['station-watch', 'check', stationId];
}

export function useWatches() {
  return useQuery({
    queryKey: ['station-watches'],
    queryFn: () => api.get<WatchStation[]>('/v1/portal/station-watches'),
  });
}

// Whether the driver watches the station, or one unit of it when unitId is set.
export function useIsWatching(stationId: string, unitId?: string | null) {
  return useQuery({
    queryKey: checkKey(stationId, unitId),
    queryFn: () =>
      api.get<CheckWatchResult>(
        `/v1/portal/station-watches/check/${encodeURIComponent(stationId)}${
          unitId != null ? `?unitId=${encodeURIComponent(unitId)}` : ''
        }`,
      ),
    enabled: stationId.length > 0,
  });
}

// Start watching when not watching (POST by OCPP stationId, and the unit when
// one is shown), stop when watching (DELETE by the watch record id, which the
// caller already holds).
export function useToggleWatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      stationId: string;
      unitId?: string | null;
      watchId: number | null;
      isWatching: boolean;
    }): Promise<void> => {
      if (input.isWatching) {
        if (input.watchId == null) throw new Error('Missing watch id');
        await api.del(`/v1/portal/station-watches/${String(input.watchId)}`);
        return;
      }
      await api.post(
        '/v1/portal/station-watches',
        input.unitId != null
          ? { stationId: input.stationId, unitId: input.unitId }
          : { stationId: input.stationId },
      );
    },
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: ['station-watch', 'check', input.stationId] });
      void qc.invalidateQueries({ queryKey: ['station-watches'] });
    },
  });
}
