// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ConnectorStatus } from '@/lib/types';
import type { DriverBilling } from '@/lib/fleet-billing';
import type { StationUnit } from '@/lib/station-units';

export interface ConnectorSummary {
  connectorType: string;
  maxPowerKw: number | null;
  maxCurrentAmps: number | null;
  status: ConnectorStatus;
}

// A station with units (charger boxes) returns one search or nearby row per
// unit, plus one row (unitId null) for its EVSEs without a unit; evseCount,
// availableCount and connectors are that row's. A station without units
// returns one row with both null. Rows can share a stationId, so lists key them
// with chargerKey (@/lib/station-units).
interface ChargerRowUnit {
  unitId?: string | null;
  unitName?: string | null;
}

export interface NearbyStation extends ChargerRowUnit {
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

export interface SearchStation extends ChargerRowUnit {
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
  // The unit (charger box) of this EVSE on a station with units; null for an
  // EVSE without a unit and on a station without units.
  unitId?: string | null;
  connectors: StationConnector[];
  reservationExpiresAt: string | null;
  // An active reservation holds this EVSE.
  reserved: boolean;
  // The signed-in driver holds that reservation.
  reservedByMe: boolean;
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
  // The units of a station with several charger boxes, each its own charger
  // for drivers. Empty for a station without units.
  units?: StationUnit[];
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

// GET /v1/portal/chargers/:stationId/pricing. Prices are net decimal strings
// in major units of the company currency ("0.2152"). taxRate is a decimal
// string ("0.19") that the amount charged adds on top. Show prices through
// priceForDisplay (@/lib/price-display) as the driver chose.
export interface PricingInfo {
  currency: string;
  pricePerKwh: string | null;
  pricePerMinute: string | null;
  pricePerSession: string | null;
  idleFeePricePerMinute: string | null;
  taxRate: string | null;
  isFreeVend: boolean;
  // How the driver pays a session started here: account means the fleet pays
  // and no card is needed. Null at a free vend site.
  billing?: DriverBilling | null;
  // The AC and DC prices of a station with AC and DC EVSEs whose prices
  // differ (AC and DC tariffs, CSMS v0.1.52). Empty or absent otherwise.
  byChargingKind?: ChargingKindPrice[];
}

export interface ChargingKindPrice {
  chargingKind: 'ac' | 'dc';
  pricePerKwh: string | null;
  pricePerMinute: string | null;
  pricePerSession: string | null;
  idleFeePricePerMinute: string | null;
  taxRate: string | null;
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
  connectorStatus: ConnectorStatus;
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
