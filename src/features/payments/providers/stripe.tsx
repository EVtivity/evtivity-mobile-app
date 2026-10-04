// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import { api } from '@/lib/api';
import { APP_NAME } from '@/lib/config';
import { clientConfigString, type ClientConfig } from '@/lib/payment-provider';
import { newSetupAttemptId, submitMethodSetup, useInvalidatePaymentMethods } from '../api';
import type { AddCardResult, MobilePaymentModule } from '../registry';

// The ephemeral-key route mints the key for the native PaymentSheet and starts
// a card-only SetupIntent in the same call.
interface EphemeralKeyResponse {
  provider: string;
  ephemeralKey: string;
  customerId: string;
  publishableKey: string;
  setupIntentClientSecret: string | null;
}

// The Stripe SDK pins this API version; it is echoed to the ephemeral-key
// endpoint so the key is minted against a matching version.
const STRIPE_API_VERSION = '2024-06-20';

function fetchEphemeralKey(): Promise<EphemeralKeyResponse> {
  return api.post<EphemeralKeyResponse>(
    `/v1/portal/payment-methods/ephemeral-key?stripeVersion=${encodeURIComponent(STRIPE_API_VERSION)}`,
  );
}

function StripeCardProvider({
  config,
  children,
}: {
  config: ClientConfig;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <StripeProvider publishableKey={clientConfigString(config, 'publishableKey') ?? ''}>
      {/* StripeProvider types its children as a single element. */}
      <>{children}</>
    </StripeProvider>
  );
}

// Runs the native Stripe PaymentSheet in setup mode: fetch the ephemeral key
// and SetupIntent, present the sheet, then save the confirmed payment method
// through the generic setup/submit step. Returns 'cancelled' when the driver
// dismisses the sheet so the caller can stay quiet, or throws on a failure.
function useStripeAddCard(_config: ClientConfig): () => Promise<AddCardResult> {
  const { initPaymentSheet, presentPaymentSheet, retrieveSetupIntent } = useStripe();
  const invalidate = useInvalidatePaymentMethods();

  return async (): Promise<AddCardResult> => {
    const attemptId = newSetupAttemptId();
    const key = await fetchEphemeralKey();
    const clientSecret = key.setupIntentClientSecret;
    if (clientSecret == null) {
      throw new Error('Could not start the card setup');
    }

    const init = await initPaymentSheet({
      merchantDisplayName: APP_NAME,
      customerId: key.customerId,
      customerEphemeralKeySecret: key.ephemeralKey,
      setupIntentClientSecret: clientSecret,
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

    // The native sheet confirms the SetupIntent (3DS included) but does not
    // hand back the payment method id. Retrieve it so the backend can verify
    // and persist the card against this driver's customer.
    const retrieved = await retrieveSetupIntent(clientSecret);
    const paymentMethodId = retrieved.setupIntent?.paymentMethodId;
    if (retrieved.error != null || paymentMethodId == null) {
      throw new Error(retrieved.error?.message ?? 'Could not confirm the saved card');
    }

    const result = await submitMethodSetup('stripe', attemptId, { paymentMethodId });
    if (result.status !== 'saved') {
      // The sheet already completed every customer action, so the API has
      // nothing left to ask for.
      throw new Error('Could not confirm the saved card');
    }

    await invalidate();
    return 'added';
  };
}

export const stripeModule: MobilePaymentModule = {
  id: 'stripe',
  Provider: StripeCardProvider,
  useAddCard: useStripeAddCard,
};
