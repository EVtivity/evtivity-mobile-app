// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface FavoriteStation {
  id: number;
  stationId: string;
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

export function useFavorites() {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: () => api.get<FavoriteStation[]>('/v1/portal/favorites'),
  });
}

export function useIsFavorite(stationId: string) {
  return useQuery({
    queryKey: ['favorites', 'check', stationId],
    queryFn: () =>
      api.get<CheckFavoriteResult>(`/v1/portal/favorites/check/${encodeURIComponent(stationId)}`),
    enabled: stationId.length > 0,
  });
}

// Add when not favorited (POST by OCPP stationId), remove when favorited
// (DELETE by the favorite record id, which the caller already holds).
export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      stationId: string;
      favoriteId: number | null;
      isFavorited: boolean;
    }): Promise<void> => {
      if (input.isFavorited) {
        if (input.favoriteId == null) throw new Error('Missing favorite id');
        await api.del(`/v1/portal/favorites/${String(input.favoriteId)}`);
        return;
      }
      await api.post('/v1/portal/favorites', { stationId: input.stationId });
    },
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: ['favorites'] });
      void qc.invalidateQueries({ queryKey: ['favorites', 'check', input.stationId] });
    },
  });
}
