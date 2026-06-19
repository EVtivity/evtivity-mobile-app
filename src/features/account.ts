// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Driver, Vehicle, RfidToken } from '@/lib/types';

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
    onSuccess: () => {
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
    onSuccess: () => {
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
