// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface FavoriteStation {
  id: number;
  stationId: string;
  // The favorited unit (charger box) of a station with units; null for a
  // favorite of the whole station. The counts are that unit's.
  unitId?: string | null;
  unitName?: string | null;
  siteName: string | null;
  siteAddress: string | null;
  siteCity: string | null;
  siteState: string | null;
  isOnline: boolean;
  evseCount: number;
  availableCount: number;
  createdAt: string;
}

interface CheckFavoriteResult {
  isFavorite: boolean;
  favoriteId: number | null;
}

// The check query key: the station key as before, with the unit added for a
// unit favorite, so invalidating the station key covers its units too.
function checkKey(stationId: string, unitId: string | null | undefined): readonly unknown[] {
  return unitId != null
    ? ['favorites', 'check', stationId, unitId]
    : ['favorites', 'check', stationId];
}

export function useFavorites() {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.get<FavoriteStation[]>('/v1/portal/favorites'),
  });
}

// Whether the driver favorited the station, or one unit of it when unitId is set.
export function useIsFavorite(stationId: string, unitId?: string | null) {
  return useQuery({
    queryKey: checkKey(stationId, unitId),
    queryFn: () =>
      api.get<CheckFavoriteResult>(
        `/v1/portal/favorites/check/${encodeURIComponent(stationId)}${
          unitId != null ? `?unitId=${encodeURIComponent(unitId)}` : ''
        }`,
      ),
    enabled: stationId.length > 0,
  });
}

// Add when not favorited (POST by OCPP stationId, and the unit when one is
// shown), remove when favorited (DELETE by the favorite record id, which the
// caller already holds).
export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      stationId: string;
      unitId?: string | null;
      favoriteId: number | null;
      isFavorited: boolean;
    }): Promise<void> => {
      if (input.isFavorited) {
        if (input.favoriteId == null) throw new Error('Missing favorite id');
        await api.del(`/v1/portal/favorites/${String(input.favoriteId)}`);
        return;
      }
      await api.post(
        '/v1/portal/favorites',
        input.unitId != null
          ? { stationId: input.stationId, unitId: input.unitId }
          : { stationId: input.stationId },
      );
    },
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: ['favorites'] });
      void qc.invalidateQueries({ queryKey: ['favorites', 'check', input.stationId] });
    },
  });
}
