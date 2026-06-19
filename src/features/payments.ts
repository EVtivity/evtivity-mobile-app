// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStripe } from '@stripe/stripe-react-native';
import { api } from '@/lib/api';
import { APP_NAME } from '@/lib/config';

// The portal payment-methods endpoint returns the local driver_payment_methods
// rows. Stripe-internal identifiers are stripped server-side; the client only
// sees display fields plus the numeric row id and default flag.
export interface PaymentCard {
  id: number;
  cardBrand: string | null;
  cardLast4: string | null;
  isDefault: boolean;
}

export interface EphemeralKeyResponse {
  ephemeralKey: string;
  customerId: string;
  publishableKey: string;
}

interface SetupIntentResponse {
  clientSecret: string;
  customerId: string;
  publishableKey: string;
}

// The Stripe SDK pins this API version; it is echoed to the ephemeral-key
// endpoint so the key is minted against a matching version.
const STRIPE_API_VERSION = '2024-06-20';

const PAYMENT_METHODS_KEY = ['payment-methods'] as const;

export function fetchEphemeralKey(): Promise<EphemeralKeyResponse> {
  return api.post<EphemeralKeyResponse>(
    `/v1/portal/payment-methods/ephemeral-key?stripeVersion=${encodeURIComponent(STRIPE_API_VERSION)}`,
  );
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: PAYMENT_METHODS_KEY,
    queryFn: () => api.get<PaymentCard[]>('/v1/portal/payment-methods'),
  });
}

export type AddCardResult = 'added' | 'cancelled';

// Runs the native Stripe PaymentSheet in setup mode: fetch the SetupIntent,
// initialise the sheet with the already-fetched ephemeral key + customer id,
// present it, then persist the confirmed payment method to the backend.
// Returns 'cancelled' when the driver dismisses the sheet so the caller can
// stay quiet, or throws on a real failure.
export function useAddCard(ephemeralKey: EphemeralKeyResponse | null) {
  const { initPaymentSheet, presentPaymentSheet, retrieveSetupIntent } = useStripe();
  const qc = useQueryClient();

  return async (): Promise<AddCardResult> => {
    if (ephemeralKey == null) {
      throw new Error('Payment provider not ready');
    }

    const setup = await api.post<SetupIntentResponse>('/v1/portal/payment-methods/setup-intent');

    const init = await initPaymentSheet({
      merchantDisplayName: APP_NAME,
      customerId: ephemeralKey.customerId,
      customerEphemeralKeySecret: ephemeralKey.ephemeralKey,
      setupIntentClientSecret: setup.clientSecret,
      allowsDelayedPaymentMethods: false,
    });
    if (init.error != null) {
      throw new Error(init.error.message);
    }

    const present = await presentPaymentSheet();
    if (present.error != null) {
      if (present.error.code === 'Canceled') return 'cancelled';
      throw new Error(present.error.message);
    }

    // The native sheet confirms the SetupIntent but does not hand back the
    // payment method id. Retrieve it so the backend can persist (and re-verify)
    // the card against this driver's Stripe customer.
    const retrieved = await retrieveSetupIntent(setup.clientSecret);
    const paymentMethodId = retrieved.setupIntent?.paymentMethodId;
    if (retrieved.error != null || paymentMethodId == null) {
      throw new Error(retrieved.error?.message ?? 'Could not confirm the saved card');
    }

    await api.post('/v1/portal/payment-methods', {
      stripePaymentMethodId: paymentMethodId,
      stripeCustomerId: setup.customerId,
    });

    await qc.invalidateQueries({ queryKey: PAYMENT_METHODS_KEY });
    return 'added';
  };
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
