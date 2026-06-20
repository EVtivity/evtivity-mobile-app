// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ConnectorStatus } from '@/lib/types';

export interface ConnectorSummary {
  connectorType: string;
  maxPowerKw: number | null;
  maxCurrentAmps: number | null;
  status: ConnectorStatus;
}

export interface NearbyStation {
  stationId: string;
  model: string | null;
  isOnline: boolean;
  siteName: string | null;
  siteAddress: string | null;
  siteCity: string | null;
  distanceKm: number;
  evseCount: number;
  availableCount: number;
  connectors: ConnectorSummary[];
}

export interface SearchStation {
  stationId: string;
  model: string | null;
  isOnline: boolean;
  siteName: string | null;
  siteAddress: string | null;
  siteCity: string | null;
  evseCount: number;
  availableCount: number;
  connectors: ConnectorSummary[];
}

export interface StationConnector {
  connectorId: number;
  connectorType: string | null;
  maxPowerKw: number | null;
  maxCurrentAmps: number | null;
  status: ConnectorStatus;
}

export interface StationEvse {
  evseId: number;
  connectors: StationConnector[];
  reservationExpiresAt: string | null;
  reservationDriverId: string | null;
}

export interface StationDetail {
  stationId: string;
  siteId: string | null;
  model: string | null;
  isOnline: boolean;
  isSimulator: boolean;
  siteName: string | null;
  siteAddress: string | null;
  siteCity: string | null;
  siteState: string | null;
  siteContactName?: string | null;
  siteContactEmail?: string | null;
  siteContactPhone?: string | null;
  paymentEnabled: boolean;
  evses: StationEvse[];
  maintenance: { active: boolean; plannedEndAt?: string | null; message?: string | null } | null;
}

export function useNearbyChargers(coords: { lat: number; lng: number } | null) {
  return useQuery({
    queryKey: ['chargers', 'nearby', coords?.lat ?? null, coords?.lng ?? null],
    queryFn: () =>
      api.get<NearbyStation[]>(
        `/v1/portal/chargers/nearby?lat=${String(coords?.lat)}&lng=${String(coords?.lng)}&radius=50&limit=20`,
      ),
    enabled: coords != null,
  });
}

export function useSearchChargers(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['chargers', 'search', trimmed],
    queryFn: () =>
      api.get<SearchStation[]>(`/v1/portal/chargers/search?q=${encodeURIComponent(trimmed)}`),
    enabled: trimmed.length > 0,
  });
}

export interface PricingInfo {
  currency: string;
  pricePerKwh: number | null;
  pricePerMinute: number | null;
  pricePerSession: number | null;
  idleFeePricePerMinute: number | null;
  taxRate: number | null;
  isFreeVend: boolean;
}

export function usePricing(stationId: string) {
  return useQuery({
    queryKey: ['pricing', stationId],
    queryFn: () =>
      api.get<PricingInfo>(`/v1/portal/chargers/${encodeURIComponent(stationId)}/pricing`),
    enabled: stationId.length > 0,
    staleTime: 60_000,
  });
}

export interface RoamingStation {
  id: number;
  partnerId: string;
  countryCode: string;
  partyId: string;
  locationId: string;
  name: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  evseCount: number;
}

export function useSearchRoaming(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['chargers', 'roaming', trimmed],
    queryFn: () =>
      api.get<RoamingStation[]>(`/v1/portal/chargers/roaming?q=${encodeURIComponent(trimmed)}`),
    enabled: trimmed.length > 0,
  });
}

export function useStation(stationId: string) {
  return useQuery({
    queryKey: ['station', stationId],
    queryFn: () => api.get<StationDetail>(`/v1/portal/chargers/${encodeURIComponent(stationId)}`),
    enabled: stationId.length > 0,
    // Connector status (plugged/unplugged, charging, faulted) changes on the
    // station side with no push channel to the app. Poll while the detail
    // screen is open so plug/unplug reflects within ~4s; polling stops on
    // unmount and pauses when the app is backgrounded (focusManager). Override
    // the global staleTime so focus always refetches.
    refetchInterval: 4000,
    staleTime: 0,
  });
}

interface StartResult {
  chargingSessionId: string;
}

export function useStartCharging() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      stationId: string;
      evseId: number;
      paymentMethodId?: number;
    }): Promise<{ sessionId: string }> =>
      api
        .post<StartResult>(
          `/v1/portal/chargers/${encodeURIComponent(input.stationId)}/evse/${String(input.evseId)}/start`,
          input.paymentMethodId != null ? { paymentMethodId: input.paymentMethodId } : {},
        )
        .then((r) => ({ sessionId: r.chargingSessionId })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sessions', 'active'] });
    },
  });
}

interface CheckStatusResult {
  connectorStatus: ConnectorStatus | null;
  error?: string;
}

export function checkConnectorStatus(
  stationId: string,
  evseId: number,
): Promise<CheckStatusResult> {
  return api.post<CheckStatusResult>(
    `/v1/portal/chargers/${encodeURIComponent(stationId)}/evse/${String(evseId)}/check-status`,
    {},
  );
}
