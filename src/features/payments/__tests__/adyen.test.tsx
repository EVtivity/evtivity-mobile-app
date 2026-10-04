// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The Adyen card module with the native SDK mocked: the SDK's AdyenCheckout
// records its props so the test can play the SDK's callbacks.

const mockPost = jest.fn();
const mockShow = jest.fn();
const mockStart = jest.fn();
const mockCheckoutProps: { current: Record<string, unknown> | null } = { current: null };

jest.mock('@/lib/api', () => ({
  api: { post: (...args: unknown[]) => mockPost(...args) },
  ApiError: class ApiError extends Error {},
}));
jest.mock('@/components/ui', () => ({ useToast: () => ({ show: mockShow }) }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'de' } }),
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-000000000001' }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { scheme: 'mybrand' } },
}));
jest.mock('@stripe/stripe-react-native', () => ({
  StripeProvider: ({ children }: { children: unknown }) => children,
  useStripe: () => ({}),
}));
jest.mock('@adyen/react-native', () => ({
  ErrorCode: { canceled: 'canceledByShopper' },
  useAdyenCheckout: () => ({ start: mockStart, isReady: true }),
  AdyenCheckout: (props: Record<string, unknown> & { children: unknown }) => {
    mockCheckoutProps.current = props;
    return props.children;
  },
}));

import React from 'react';
import { NativeModules } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { resolvePaymentModule } from '@/lib/payment-provider';
import { getPaymentModule, REGISTERED_PAYMENT_PROVIDERS } from '../registry';
import { adyenModule } from '../providers/adyen';
import type { AddCardResult } from '../registry';

const ATTEMPT = '00000000-0000-4000-8000-000000000001';
const CONFIG = { provider: 'adyen', clientKey: 'test_KEY', environment: 'test' };
const SESSION = {
  provider: 'adyen',
  clientKey: 'test_KEY',
  environment: 'live',
  customerId: 'evt_1',
  countryCode: 'DE',
  currency: 'EUR',
  paymentMethodsResponse: {
    paymentMethods: [{ type: 'scheme', name: 'Cards' }],
    storedPaymentMethods: [{ id: 'tok', type: 'scheme' }],
  },
};
const SUBMIT_DATA = {
  paymentMethod: { type: 'scheme', encryptedCardNumber: 'enc' },
  browserInfo: { userAgent: 'iPhone' },
  returnUrl: 'mybrand://payments/adyen',
};
const SAVED = { status: 'saved', method: { id: 1, cardBrand: 'visa', cardLast4: '0000' } };

function component() {
  return { handle: jest.fn(), hide: jest.fn() };
}

type Callback = (data: unknown, comp: ReturnType<typeof component>) => void;

function callback(name: 'onSubmit' | 'onAdditionalDetails' | 'onError'): Callback {
  const fn = mockCheckoutProps.current?.[name];
  if (typeof fn !== 'function') throw new Error(`AdyenCheckout has no ${name}`);
  return fn as Callback;
}

/** Renders the module's Provider, Overlay, and a button-less harness exposing addCard. */
async function setup(): Promise<{ addCard: () => Promise<AddCardResult> }> {
  const Provider = adyenModule.Provider!;
  const Overlay = adyenModule.Overlay!;
  const handle: { addCard: (() => Promise<AddCardResult>) | null } = { addCard: null };
  function Harness(): null {
    handle.addCard = adyenModule.useAddCard(CONFIG);
    return null;
  }
  const client = new QueryClient();
  await render(
    <QueryClientProvider client={client}>
      <Provider config={CONFIG}>
        <Harness />
        <Overlay />
      </Provider>
    </QueryClientProvider>,
  );
  return { addCard: () => handle.addCard!() };
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  mockPost.mockReset();
  mockShow.mockReset();
  mockStart.mockReset();
  mockCheckoutProps.current = null;
  (NativeModules as Record<string, unknown>).AdyenDropIn = {};
});

describe('registry', () => {
  it('registers the Adyen module and still reports an unknown provider as unsupported', () => {
    expect(getPaymentModule('adyen')).toBe(adyenModule);
    expect(REGISTERED_PAYMENT_PROVIDERS).toContain('adyen');
    const descriptor = (provider: string) => ({
      paymentEnabled: true,
      provider: { provider },
      capabilities: null,
    });
    expect(resolvePaymentModule(descriptor('adyen'), REGISTERED_PAYMENT_PROVIDERS)).toEqual({
      kind: 'module',
      id: 'adyen',
    });
    expect(resolvePaymentModule(descriptor('mollie'), REGISTERED_PAYMENT_PROVIDERS)).toEqual({
      kind: 'unsupported',
      provider: 'mollie',
    });
  });
});

describe('adyen module', () => {
  it('tells the driver to update a build without the native SDK and calls no API', async () => {
    delete (NativeModules as Record<string, unknown>).AdyenDropIn;
    const { addCard } = await setup();
    await expect(addCard()).resolves.toBe('cancelled');
    expect(mockShow).toHaveBeenCalledWith('paymentProviders.adyen.unavailable', 'error');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('opens the card form and saves the card from setup/submit with the app platform', async () => {
    mockPost.mockResolvedValueOnce({ provider: 'adyen', session: SESSION });
    const { addCard } = await setup();
    let result: Promise<AddCardResult> = Promise.resolve('cancelled');
    await act(async () => {
      result = addCard();
      await Promise.resolve();
    });
    await flush();
    expect(mockPost).toHaveBeenCalledWith('/v1/portal/payment-methods/setup-intent');
    expect(mockStart).toHaveBeenCalledWith('dropIn');
    expect(mockCheckoutProps.current?.['config']).toEqual({
      environment: 'live-eu',
      clientKey: 'test_KEY',
      countryCode: 'DE',
      locale: 'de',
      returnUrl: 'mybrand://payments/adyen',
      dropin: { skipListWhenSinglePaymentMethod: true, title: 'payments.addCard' },
      card: { holderNameRequired: false, showStorePaymentField: false },
    });
    expect(mockCheckoutProps.current?.['paymentMethods']).toEqual({
      paymentMethods: [{ type: 'scheme', name: 'Cards' }],
    });

    mockPost.mockResolvedValueOnce(SAVED);
    const comp = component();
    await act(async () => {
      callback('onSubmit')(SUBMIT_DATA, comp);
      await Promise.resolve();
    });
    await expect(result).resolves.toBe('added');
    expect(mockPost).toHaveBeenLastCalledWith('/v1/portal/payment-methods/setup/submit', {
      provider: 'adyen',
      attemptId: ATTEMPT,
      payload: {
        paymentMethod: SUBMIT_DATA.paymentMethod,
        browserInfo: SUBMIT_DATA.browserInfo,
        currency: 'EUR',
      },
      browser: {
        platform: 'ios',
        returnUrl: 'mybrand://payments/adyen',
        info: SUBMIT_DATA.browserInfo,
      },
    });
    expect(comp.hide).toHaveBeenCalledWith(true);
    expect(mockCheckoutProps.current).not.toBeNull();
  });

  it('hands a 3D Secure action to the SDK and saves the card from setup/details', async () => {
    mockPost.mockResolvedValueOnce({ provider: 'adyen', session: SESSION });
    const { addCard } = await setup();
    let result: Promise<AddCardResult> = Promise.resolve('cancelled');
    await act(async () => {
      result = addCard();
      await Promise.resolve();
    });
    await flush();

    const action = { type: 'redirect', url: 'https://test.adyen.com/3ds', method: 'GET' };
    mockPost.mockResolvedValueOnce({
      status: 'action_required',
      action: { provider: 'adyen', data: action },
    });
    const comp = component();
    await act(async () => {
      callback('onSubmit')(SUBMIT_DATA, comp);
      await Promise.resolve();
    });
    expect(comp.handle).toHaveBeenCalledWith(action);
    expect(comp.hide).not.toHaveBeenCalled();

    mockPost.mockResolvedValueOnce(SAVED);
    const details = { details: { redirectResult: 'X6Xtf' } };
    await act(async () => {
      callback('onAdditionalDetails')(details, comp);
      await Promise.resolve();
    });
    await expect(result).resolves.toBe('added');
    expect(mockPost).toHaveBeenLastCalledWith('/v1/portal/payment-methods/setup/details', {
      provider: 'adyen',
      attemptId: ATTEMPT,
      details,
    });
    expect(comp.hide).toHaveBeenCalledWith(true);
  });

  it('settles cancelled when the driver closes the card form', async () => {
    mockPost.mockResolvedValueOnce({ provider: 'adyen', session: SESSION });
    const { addCard } = await setup();
    let result: Promise<AddCardResult> = Promise.resolve('added');
    await act(async () => {
      result = addCard();
      await Promise.resolve();
    });
    await flush();
    const comp = component();
    await act(async () => {
      callback('onError')({ errorCode: 'canceledByShopper', message: 'closed' }, comp);
      await Promise.resolve();
    });
    await expect(result).resolves.toBe('cancelled');
    expect(comp.hide).toHaveBeenCalledWith(false);
  });

  it('closes the form and throws the API error of a refused card', async () => {
    mockPost.mockResolvedValueOnce({ provider: 'adyen', session: SESSION });
    const { addCard } = await setup();
    // Observe the outcome at once, so the rejection is never unhandled.
    let outcome: Promise<unknown> = Promise.resolve(null);
    await act(async () => {
      outcome = addCard().then(
        () => null,
        (err: unknown) => err,
      );
      await Promise.resolve();
    });
    await flush();
    const refused = new Error('API error 400');
    mockPost.mockRejectedValueOnce(refused);
    const comp = component();
    await act(async () => {
      callback('onSubmit')(SUBMIT_DATA, comp);
      await Promise.resolve();
    });
    await expect(outcome).resolves.toBe(refused);
    expect(comp.hide).toHaveBeenCalledWith(false);
  });

  it('refuses an incomplete setup session', async () => {
    mockPost.mockResolvedValueOnce({ provider: 'adyen', session: { provider: 'adyen' } });
    const { addCard } = await setup();
    await expect(addCard()).rejects.toThrow('The Adyen setup session is incomplete');
    expect(mockStart).not.toHaveBeenCalled();
  });
});
