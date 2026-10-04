// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import {
  clientConfigString,
  resolvePaymentModule,
  type PaymentProviderDescriptor,
} from '@/lib/payment-provider';

const capabilities = { savedMethods: true, clientActions: true, nativeMobileSheet: true };

describe('resolvePaymentModule', () => {
  it('is disabled when payments are not enabled', () => {
    const d: PaymentProviderDescriptor = {
      paymentEnabled: false,
      provider: null,
      capabilities: null,
    };
    expect(resolvePaymentModule(d, ['stripe'])).toEqual({ kind: 'disabled' });
  });

  it('is disabled when no provider config is returned', () => {
    const d: PaymentProviderDescriptor = { paymentEnabled: true, provider: null, capabilities };
    expect(resolvePaymentModule(d, ['stripe'])).toEqual({ kind: 'disabled' });
  });

  it('is unsupported when the app has no module for the provider', () => {
    const d: PaymentProviderDescriptor = {
      paymentEnabled: true,
      provider: { provider: 'adyen', clientKey: 'test_x', environment: 'test' },
      capabilities,
    };
    expect(resolvePaymentModule(d, ['stripe'])).toEqual({
      kind: 'unsupported',
      provider: 'adyen',
    });
  });

  it('selects the registered module for the provider', () => {
    const d: PaymentProviderDescriptor = {
      paymentEnabled: true,
      provider: { provider: 'stripe', publishableKey: 'pk_test_x' },
      capabilities,
    };
    expect(resolvePaymentModule(d, ['stripe', 'simulated'])).toEqual({
      kind: 'module',
      id: 'stripe',
    });
  });
});

describe('clientConfigString', () => {
  const config = { provider: 'stripe', publishableKey: 'pk_test_x', empty: '', count: 3 };

  it('returns a non-empty string field', () => {
    expect(clientConfigString(config, 'publishableKey')).toBe('pk_test_x');
  });

  it('returns null for a missing, empty or non-string field', () => {
    expect(clientConfigString(config, 'missing')).toBeNull();
    expect(clientConfigString(config, 'empty')).toBeNull();
    expect(clientConfigString(config, 'count')).toBeNull();
  });
});
