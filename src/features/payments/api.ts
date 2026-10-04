// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { api } from '@/lib/api';
import type { PaymentProviderDescriptor } from '@/lib/payment-provider';

// The portal payment-methods endpoint returns the local driver_payment_methods
// rows. Provider identifiers are stripped server-side; the client only sees
// display fields plus the numeric row id and default flag.
export interface PaymentCard {
  id: number;
  cardBrand: string | null;
  cardLast4: string | null;
  isDefault: boolean;
}

/** Result of a card setup step (setup/submit, setup/details). A refused card is a 400 ApiError. */
export type SetupStepResponse =
  | { status: 'saved'; method: PaymentCard }
  | { status: 'action_required'; action: { provider: string; data: unknown } };

export const PAYMENT_METHODS_KEY = ['payment-methods'] as const;
export const PAYMENT_PROVIDER_KEY = ['payment-provider'] as const;

/** The active provider's descriptor. Changes only when the operator switches provider. */
export function usePaymentProvider() {
  return useQuery({
    queryKey: PAYMENT_PROVIDER_KEY,
    queryFn: () => api.get<PaymentProviderDescriptor>('/v1/portal/payment-provider'),
    staleTime: 60_000,
  });
}

/** Idempotency key of one add-card attempt; reused for every step of that attempt. */
export function newSetupAttemptId(): string {
  return Crypto.randomUUID();
}

/** Where the card UI runs, for a 3D Secure step (Adyen): the app platform and its SDK return URL. */
export interface SetupBrowser {
  platform: 'ios' | 'android';
  returnUrl: string;
  info?: unknown;
}

export function submitMethodSetup(
  provider: string,
  attemptId: string,
  payload: unknown,
  browser?: SetupBrowser,
): Promise<SetupStepResponse> {
  return api.post<SetupStepResponse>('/v1/portal/payment-methods/setup/submit', {
    provider,
    attemptId,
    payload,
    ...(browser != null ? { browser } : {}),
  });
}

export function submitMethodSetupDetails(
  provider: string,
  attemptId: string,
  details: unknown,
): Promise<SetupStepResponse> {
  return api.post<SetupStepResponse>('/v1/portal/payment-methods/setup/details', {
    provider,
    attemptId,
    details,
  });
}

/** Refreshes the card list after a module saved a card. */
export function useInvalidatePaymentMethods(): () => Promise<void> {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: PAYMENT_METHODS_KEY });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: PAYMENT_METHODS_KEY,
    queryFn: () => api.get<PaymentCard[]>('/v1/portal/payment-methods'),
  });
}

export function useSetDefaultCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pmId: number) =>
      api.patch<PaymentCard>(`/v1/portal/payment-methods/${String(pmId)}/default`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PAYMENT_METHODS_KEY });
    },
  });
}

export function useDeleteCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pmId: number) =>
      api.del<{ success: true }>(`/v1/portal/payment-methods/${String(pmId)}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PAYMENT_METHODS_KEY });
    },
  });
}
