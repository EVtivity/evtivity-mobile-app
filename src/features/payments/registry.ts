// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import type React from 'react';
import type { ClientConfig } from '@/lib/payment-provider';
import { simulatedModule } from './providers/simulated';
import { stripeModule } from './providers/stripe';

export type AddCardResult = 'added' | 'cancelled';

/**
 * One payment provider's add-card UI. The payment-methods screen renders the
 * module the API descriptor names and never calls a provider SDK itself.
 */
export interface MobilePaymentModule {
  id: string;
  /** Wraps the card list (Stripe: StripeProvider). */
  Provider?: React.ComponentType<{ config: ClientConfig; children: React.ReactNode }>;
  /** Hook returning the add-card action; the action throws on failure. */
  useAddCard(config: ClientConfig): () => Promise<AddCardResult>;
  /** Optional UI the hook drives (simulated: test card modal). */
  Overlay?: React.ComponentType;
}

const MODULES: Readonly<Record<string, MobilePaymentModule>> = {
  stripe: stripeModule,
  simulated: simulatedModule,
};

export const REGISTERED_PAYMENT_PROVIDERS: readonly string[] = Object.keys(MODULES);

export function getPaymentModule(id: string): MobilePaymentModule | null {
  return Object.hasOwn(MODULES, id) ? (MODULES[id] ?? null) : null;
}
