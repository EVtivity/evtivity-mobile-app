// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Public site detail shown on the location screen (map, hours, contact, counts).
export interface LocationDetail {
  siteId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  hoursOfOperation: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  stationCount: number;
  evseCount: number;
  availableCount: number;
}

export interface LocationImage {
  id: number;
  stationId: number;
  fileName: string;
  fileSize: number;
  contentType: string;
  caption: string | null;
}

export interface PopularTime {
  dow: number;
  hour: number;
  avgSessions: number;
}

export interface MapConfig {
  apiKey: string;
  defaultLat: number;
  defaultLng: number;
  defaultZoom: number;
}

export function useLocationDetail(siteId: string) {
  return useQuery({
    queryKey: ['location', siteId],
    queryFn: () =>
      api.get<LocationDetail>(`/v1/portal/chargers/location/${encodeURIComponent(siteId)}`),
    enabled: siteId.length > 0,
  });
}

export function useLocationImages(siteId: string) {
  return useQuery({
    queryKey: ['location', siteId, 'images'],
    queryFn: () =>
      api.get<LocationImage[]>(`/v1/portal/chargers/location/${encodeURIComponent(siteId)}/images`),
    enabled: siteId.length > 0,
  });
}

export function fetchImageDownloadUrl(siteId: string, imageId: number): Promise<string> {
  return api
    .get<{
      downloadUrl: string;
    }>(
      `/v1/portal/chargers/location/${encodeURIComponent(siteId)}/images/${String(imageId)}/download-url`,
    )
    .then((r) => r.downloadUrl);
}

export function usePopularTimes(siteId: string) {
  return useQuery({
    queryKey: ['location', siteId, 'popular-times'],
    queryFn: () =>
      api.get<PopularTime[]>(
        `/v1/portal/chargers/location/${encodeURIComponent(siteId)}/popular-times`,
      ),
    enabled: siteId.length > 0,
  });
}

export function useMapConfig() {
  return useQuery({
    queryKey: ['map-config'],
    queryFn: () => api.get<MapConfig>('/v1/portal/chargers/map-config'),
    staleTime: 60 * 60 * 1000,
  });
}
