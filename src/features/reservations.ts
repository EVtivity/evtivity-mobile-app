// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Shape returned by GET /v1/portal/reservations. stationOcppId is the station
// identity; startsAt is null for immediately-active reservations.
export interface ReservationItem {
  id: string;
  reservationId: number;
  stationOcppId: string;
  status: 'scheduled' | 'active' | 'used' | 'cancelled' | 'expired' | 'system_cancelled' | string;
  startsAt: string | null;
  expiresAt: string;
  createdAt: string;
}

// POST /v1/portal/reservations body. stationId is the OCPP station identifier,
// expiresAt is required, startsAt is optional (omit for an immediate window).
export interface CreateReservationInput {
  stationId: string;
  evseId?: number;
  startsAt?: string;
  expiresAt: string;
}

interface ReservationCreated {
  id: string;
  reservationId: number;
  stationId: string;
  driverId: string | null;
  status: string;
  expiresAt: string;
  createdAt: string;
}

const RESERVATIONS_KEY = ['reservations'] as const;

// Statuses treated as upcoming: shown under the "upcoming" tab and still
// cancellable. Everything else is past/terminal.
export const UPCOMING_RESERVATION_STATUSES = new Set(['scheduled', 'active']);

export function useReservations() {
  return useQuery({
    queryKey: RESERVATIONS_KEY,
    queryFn: () => api.getData<ReservationItem>('/v1/portal/reservations'),
  });
}

// Detail shape from GET /v1/portal/reservations/:id. sessionId is set only when
// the reservation was used to start a session (links to the session detail).
export interface ReservationDetail {
  id: string;
  reservationId: number;
  stationOcppId: string;
  siteName: string | null;
  siteAddress: string | null;
  siteCity: string | null;
  siteState: string | null;
  evseId: number | null;
  status: string;
  startsAt: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  sessionId: string | null;
}

export function useReservation(id: string) {
  return useQuery({
    queryKey: ['reservation', id],
    queryFn: () => api.get<ReservationDetail>(`/v1/portal/reservations/${encodeURIComponent(id)}`),
    enabled: id.length > 0,
  });
}

export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReservationInput) =>
      api.post<ReservationCreated>('/v1/portal/reservations', input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: RESERVATIONS_KEY });
    },
  });
}

export function useCancelReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/v1/portal/reservations/${encodeURIComponent(id)}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: RESERVATIONS_KEY });
    },
  });
}
