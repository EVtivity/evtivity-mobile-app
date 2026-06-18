// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ChargingSession, Paginated } from '@/lib/types';

interface ActiveSession {
  id: string;
  stationId: string | null;
  stationName: string | null;
  transactionId: string | null;
  startedAt: string;
  energyDeliveredWh: number | null;
  currentCostCents: number | null;
  currency: string | null;
}

export interface MonthlySummary {
  totalCostCents: number;
  totalEnergyWh: number;
  totalCo2AvoidedKg: number;
  sessionCount: number;
  currency: string | null;
}

interface StopSessionResult {
  status: 'stopping' | 'stopped' | 'ghostRecovered';
  chargingSessionId: string;
}

export function useActiveSessions() {
  return useQuery({
    queryKey: ['sessions', 'active'],
    queryFn: () =>
      api
        .get<{ data: ActiveSession[] }>('/v1/portal/chargers/sessions/active')
        .then((r) => r.data),
    refetchInterval: 10_000,
  });
}

export function useRecentSessions(limit = 3) {
  return useQuery({
    queryKey: ['sessions', 'recent', limit],
    queryFn: () =>
      api
        .get<Paginated<ChargingSession>>(`/v1/portal/sessions?limit=${String(limit)}`)
        .then((r) => r.data),
    refetchInterval: 30_000,
  });
}

export function useSessionsByMonth(month: string) {
  return useQuery({
    queryKey: ['sessions', 'month', month],
    queryFn: () =>
      api
        .get<Paginated<ChargingSession>>(
          `/v1/portal/sessions?month=${encodeURIComponent(month)}&limit=100`,
        )
        .then((r) => r.data),
    enabled: month.length > 0,
  });
}

export function useMonthlySummary(month: string) {
  return useQuery({
    queryKey: ['sessions', 'monthly-summary', month],
    queryFn: () =>
      api.get<MonthlySummary>(
        `/v1/portal/sessions/monthly-summary?month=${encodeURIComponent(month)}`,
      ),
    enabled: month.length > 0,
  });
}

// Fetch several months' summaries in parallel. Shares the per-month cache with
// useMonthlySummary (same query key), so the selected month is not refetched.
export function useMonthlySummaries(months: string[]) {
  return useQueries({
    queries: months.map((month) => ({
      queryKey: ['sessions', 'monthly-summary', month],
      queryFn: () =>
        api.get<MonthlySummary>(
          `/v1/portal/sessions/monthly-summary?month=${encodeURIComponent(month)}`,
        ),
      enabled: month.length > 0,
    })),
  });
}

export interface PowerPoint {
  timestamp: string;
  powerW: number;
}

export interface EnergyPoint {
  timestamp: string;
  energyWh: number;
}

export interface SessionPayment {
  id: number;
  status: string;
  currency: string;
  preAuthAmountCents: number | null;
  capturedAmountCents: number | null;
  refundedAmountCents: number;
  paymentSource: string;
  failureReason: string | null;
}

export interface SessionVehicle {
  id: string;
  make: string | null;
  model: string | null;
  year: string | null;
  efficiencyMiPerKwh: number;
}

// Full GET /v1/portal/sessions/:id shape. Superset of ChargingSession adding the
// payment record, the token/vehicle used, the linked reservation, and live power.
export interface SessionDetail {
  id: string;
  transactionId: string | null;
  status: string;
  startedAt: string;
  endedAt: string | null;
  energyDeliveredWh: number | null;
  co2AvoidedKg: number | null;
  finalCostCents: number | null;
  currentCostCents: number | null;
  currency: string | null;
  stationName: string | null;
  siteName: string | null;
  siteAddress: string | null;
  siteCity: string | null;
  siteState: string | null;
  reservationId: string | null;
  stoppedReason: string | null;
  idleStartedAt: string | null;
  updatedAt: string | null;
  currentPowerW: number | null;
  payment: SessionPayment | null;
  token: { idToken: string; tokenType: string } | null;
  vehicle: SessionVehicle | null;
}

export function useSession(id: string) {
  return useQuery({
    queryKey: ['session', id],
    queryFn: () => api.get<SessionDetail>(`/v1/portal/sessions/${id}`),
    enabled: id.length > 0,
    refetchInterval: (query) =>
      query.state.data?.status === 'active' ? 5_000 : false,
  });
}

// Assigns (or clears, with null) the vehicle used to estimate mileage on a
// session. The session's efficiency comes from the chosen vehicle.
export function useSetSessionVehicle(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vehicleId: string | null) =>
      api.patch(`/v1/portal/sessions/${encodeURIComponent(id)}/vehicle`, { vehicleId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['session', id] });
    },
  });
}

export interface MonthlyStatement {
  month: string;
  driverName: string;
  sessions: {
    id: string;
    startedAt: string | null;
    endedAt: string | null;
    energyDeliveredWh: number | null;
    co2AvoidedKg: number | null;
    finalCostCents: number | null;
    currency: string | null;
    siteName: string | null;
    siteCity: string | null;
  }[];
  totals: {
    totalCostCents: number;
    currency: string | null;
    totalEnergyWh: number;
    totalCo2AvoidedKg: number;
    sessionCount: number;
  };
}

export function useMonthlyStatement(month: string) {
  return useQuery({
    queryKey: ['sessions', 'monthly-statement', month],
    queryFn: () =>
      api.get<MonthlyStatement>(
        `/v1/portal/sessions/monthly-statement?month=${encodeURIComponent(month)}`,
      ),
    enabled: month.length > 0,
  });
}

// Per-session time series for the live charging charts, mirroring the portal.
// Both poll every 10s while the session is active; the API prepends a synthetic
// 0-point at startedAt so a chart renders from the first real reading.
export function useSessionPowerHistory(id: string, active: boolean) {
  return useQuery({
    queryKey: ['session', id, 'power-history'],
    queryFn: () =>
      api
        .get<{ data: PowerPoint[] }>(`/v1/portal/sessions/${id}/power-history`)
        .then((r) => r.data),
    enabled: id.length > 0,
    refetchInterval: active ? 10_000 : false,
  });
}

export function useSessionEnergyHistory(id: string, active: boolean) {
  return useQuery({
    queryKey: ['session', id, 'energy-history'],
    queryFn: () =>
      api
        .get<{ data: EnergyPoint[] }>(`/v1/portal/sessions/${id}/energy-history`)
        .then((r) => r.data),
    enabled: id.length > 0,
    refetchInterval: active ? 10_000 : false,
  });
}

export function useStopSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      api.post<StopSessionResult>(`/v1/portal/chargers/sessions/${sessionId}/stop`),
    onSuccess: (_data, sessionId) => {
      void qc.invalidateQueries({ queryKey: ['session', sessionId] });
      void qc.invalidateQueries({ queryKey: ['sessions', 'active'] });
    },
  });
}
