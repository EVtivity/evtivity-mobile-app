// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { PriceDisplay } from '@/lib/price-display';
import type { Driver, Vehicle, RfidToken } from '@/lib/types';
import type { DriverBilling } from '@/lib/fleet-billing';
import type { PortalInvoice, PortalInvoiceDetail } from '@/lib/invoices';
import type { DriverBillingAddress } from '@/lib/billing-address';

/** The fields of GET /v1/portal/auth/me this app reads beyond the login driver. */
interface DriverMe {
  billing?: DriverBilling;
  billingAddress?: DriverBillingAddress;
}

// One request serves the driver billing and the billing address. A fleet
// change reaches the driver by push, so a minute of staleness is fine.
const DRIVER_ME_KEY = ['driver-billing'] as const;

function useDriverMe(enabled = true) {
  return useQuery({
    queryKey: DRIVER_ME_KEY,
    queryFn: () => api.get<DriverMe>('/v1/portal/auth/me'),
    enabled,
    staleTime: 60_000,
  });
}

// How the signed-in driver pays (GET /v1/portal/auth/me billing).
export function useDriverBilling(enabled = true): DriverBilling | undefined {
  return useDriverMe(enabled).data?.billing;
}

// The driver's billing address (GET /v1/portal/auth/me billingAddress) and
// whether the driver's fleet invoices them (the address then prints on it).
export function useDriverBillingAddress() {
  const query = useDriverMe();
  return {
    address: query.data?.billingAddress,
    billing: query.data?.billing,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

// A null field clears it.
export function useUpdateBillingAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DriverBillingAddress) =>
      api.patch<unknown>('/v1/portal/driver/billing-address', input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: DRIVER_ME_KEY });
    },
  });
}

export const INVOICE_PAGE_SIZE = 20;

// The driver's invoices and credit notes, newest first, a page at a time.
export function useInvoices() {
  return useInfiniteQuery({
    queryKey: ['invoices'],
    queryFn: ({ pageParam }) =>
      api.get<{ data: PortalInvoice[]; total: number }>(
        `/v1/portal/invoices?page=${String(pageParam)}&limit=${String(INVOICE_PAGE_SIZE)}`,
      ),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, p) => n + p.data.length, 0);
      return loaded < last.total && last.data.length > 0 ? pages.length + 1 : undefined;
    },
    staleTime: 60_000,
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () =>
      api.get<PortalInvoiceDetail>(`/v1/portal/invoices/${encodeURIComponent(id ?? '')}`),
    enabled: id != null && id !== '',
    staleTime: 60_000,
  });
}

export interface NotificationPrefs {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled?: boolean;
}

export interface MfaStatus {
  mfaEnabled: boolean;
  mfaMethod: string | null;
  availableMethods: string[];
}

interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  language?: string;
  timezone?: string;
  themePreference?: 'light' | 'dark';
  distanceUnit?: 'miles' | 'km';
  // Null follows the company setting company.priceDisplay.
  priceDisplay?: PriceDisplay | null;
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      api.patch<Driver>('/v1/portal/driver/profile', input),
    onSuccess: (driver) => {
      useAuth.getState().setDriver(driver);
      void qc.invalidateQueries({ queryKey: ['mfa-status'] });
    },
  });
}

export type MfaMethod = 'totp' | 'email' | 'sms';

export interface MfaSetupResult {
  qrDataUri?: string;
  secret?: string;
  challengeId?: number;
}

export function useMfaSetup() {
  return useMutation({
    mutationFn: (method: MfaMethod) =>
      api.post<MfaSetupResult>('/v1/portal/driver/mfa/setup', { method }),
  });
}

export function useMfaConfirm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { method: MfaMethod; code: string; challengeId?: number }) =>
      api.post<{ success: true }>('/v1/portal/driver/mfa/confirm', input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mfa-status'] });
    },
  });
}

export function useMfaDisable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (password: string) =>
      api.del<{ success: true }>('/v1/portal/driver/mfa', { password }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mfa-status'] });
    },
  });
}

export function useNotificationPrefs() {
  return useQuery({
    queryKey: ['notification-prefs'],
    queryFn: () => api.get<NotificationPrefs>('/v1/portal/driver/notification-preferences'),
  });
}

export function useUpdateNotificationPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NotificationPrefs) =>
      api.put<NotificationPrefs>('/v1/portal/driver/notification-preferences', input),
    // Apply the toggle optimistically so the Switch moves on tap instead of
    // waiting for the round-trip, then reconcile with the server's response (or
    // roll back on failure).
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ['notification-prefs'] });
      const previous = qc.getQueryData<NotificationPrefs>(['notification-prefs']);
      qc.setQueryData(['notification-prefs'], input);
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous != null) qc.setQueryData(['notification-prefs'], context.previous);
    },
    onSuccess: (data) => {
      qc.setQueryData(['notification-prefs'], data);
    },
  });
}

export function useVehicles() {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get<Vehicle[]>('/v1/portal/vehicles'),
  });
}

export interface VehicleLookup {
  makes: string[];
  models: { make: string; model: string }[];
}

// Known makes/models from the CSMS vehicle_efficiency_lookup table, so the
// add-vehicle form can pick from real data instead of free text.
export function useVehicleLookup() {
  return useQuery({
    queryKey: ['vehicle-lookup'],
    queryFn: () => api.get<VehicleLookup>('/v1/portal/vehicles/lookup'),
    staleTime: 10 * 60 * 1000,
  });
}

export function useAddVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { make: string; model: string; year?: string }) =>
      api.post<Vehicle>('/v1/portal/vehicles', input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/v1/portal/vehicles/${encodeURIComponent(id)}`),
    // On error too: a 404 VEHICLE_NOT_FOUND means the list is stale.
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

// Autocharge on or off (PATCH /v1/portal/vehicles/:id).
export function useSetVehicleAutocharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; enabled: boolean }) =>
      api.patch<Vehicle>(`/v1/portal/vehicles/${encodeURIComponent(input.id)}`, {
        autochargeEnabled: input.enabled,
      }),
    onSuccess: (updated) => {
      // Write the server's row straight into the cache so the switch settles on
      // the new state without flipping back during a refetch.
      qc.setQueryData<Vehicle[]>(
        ['vehicles'],
        (old) => old?.map((v) => (v.id === updated.id ? updated : v)) ?? old,
      );
    },
    // 403 VEHICLE_BLOCKED_BY_OPERATOR (the operator blocked it since the list
    // loaded) and 404 VEHICLE_NOT_FOUND mean the list is stale: it then shows
    // the vehicle locked or gone.
    onError: () => {
      void qc.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useRfidTokens() {
  return useQuery({
    queryKey: ['rfid-tokens'],
    queryFn: () => api.get<RfidToken[]>('/v1/portal/tokens'),
  });
}

export function useAddRfidToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { idToken: string; tokenType?: string }) =>
      api.post<RfidToken>('/v1/portal/tokens', input),
    // On error too: re-adding a card the operator blocked answers 403
    // TOKEN_BLOCKED_BY_OPERATOR, and the list then shows it locked.
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['rfid-tokens'] });
    },
  });
}

export function useToggleRfidToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; isActive: boolean }) =>
      api.patch<RfidToken>(`/v1/portal/tokens/${encodeURIComponent(input.id)}`, {
        isActive: input.isActive,
      }),
    onSuccess: (updated) => {
      // Write the server's row straight into the cache so the toggle settles on
      // the new state without flipping back to the stale value during refetch.
      qc.setQueryData<RfidToken[]>(
        ['rfid-tokens'],
        (old) => old?.map((t) => (t.id === updated.id ? updated : t)) ?? old,
      );
    },
    // 404 TOKEN_NOT_FOUND (not the driver's card) and 403
    // TOKEN_BLOCKED_BY_OPERATOR (the operator blocked it) mean the list is stale.
    onError: () => {
      void qc.invalidateQueries({ queryKey: ['rfid-tokens'] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api.patch<{ success: true }>('/v1/portal/driver/password', input),
  });
}

export function useMfaStatus() {
  return useQuery({
    queryKey: ['mfa-status'],
    queryFn: () => api.get<MfaStatus>('/v1/portal/driver/mfa'),
  });
}
