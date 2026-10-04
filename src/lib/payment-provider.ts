// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Wire types of GET /v1/portal/payment-provider and the pure decision of which
// registered payment module renders the add-card flow. The screen never names a
// provider: it renders whatever module the API descriptor selects.

/** Browser-safe client config of the active provider (provider.clientConfig()). */
export interface ClientConfig {
  provider: string;
  [key: string]: unknown;
}

export interface PaymentProviderCapabilities {
  savedMethods: boolean;
  clientActions: boolean;
  nativeMobileSheet: boolean;
}

export interface PaymentProviderDescriptor {
  paymentEnabled: boolean;
  provider: ClientConfig | null;
  capabilities: PaymentProviderCapabilities | null;
}

export type PaymentModuleResolution =
  { kind: 'disabled' } | { kind: 'unsupported'; provider: string } | { kind: 'module'; id: string };

/**
 * Picks the module for the descriptor's provider. 'disabled' when the operator
 * has no active provider, 'unsupported' when this app build has no module for
 * it (an older build against a newer provider), else the module id.
 */
export function resolvePaymentModule(
  descriptor: PaymentProviderDescriptor,
  registered: readonly string[],
): PaymentModuleResolution {
  if (!descriptor.paymentEnabled || descriptor.provider == null) return { kind: 'disabled' };
  const id = descriptor.provider.provider;
  if (!registered.includes(id)) return { kind: 'unsupported', provider: id };
  return { kind: 'module', id };
}

/** Reads a string field of a client config; null when absent or not a string. */
export function clientConfigString(config: ClientConfig, key: string): string | null {
  const value = config[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}
