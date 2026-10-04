// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import {
  adyenAction,
  adyenNativeEnvironment,
  adyenReturnUrl,
  adyenSubmitRequest,
  appScheme,
  parseAdyenSetupSession,
} from '@/lib/adyen-checkout';

const SCHEME = { type: 'scheme', name: 'Cards', brands: ['visa', 'mc'] };

function session(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    provider: 'adyen',
    clientKey: 'test_KEY',
    environment: 'test',
    customerId: 'evt_1',
    countryCode: 'DE',
    currency: 'EUR',
    paymentMethodsResponse: {
      paymentMethods: [SCHEME, { type: 'ideal', name: 'iDEAL' }, { type: 'scheme' }, null],
      storedPaymentMethods: [{ id: 'tok', type: 'scheme' }],
    },
    ...overrides,
  };
}

describe('adyenNativeEnvironment', () => {
  it('maps the web Europe name and keeps native names', () => {
    expect(adyenNativeEnvironment('live')).toBe('live-eu');
    expect(adyenNativeEnvironment('test')).toBe('test');
    expect(adyenNativeEnvironment('live-us')).toBe('live-us');
    expect(adyenNativeEnvironment('live-xx')).toBeNull();
    expect(adyenNativeEnvironment(undefined)).toBeNull();
  });
});

describe('parseAdyenSetupSession', () => {
  it('keeps only the card entry and drops stored cards', () => {
    expect(parseAdyenSetupSession(session())).toEqual({
      clientKey: 'test_KEY',
      environment: 'test',
      countryCode: 'DE',
      currency: 'EUR',
      paymentMethods: { paymentMethods: [SCHEME] },
    });
  });

  it('refuses another provider and incomplete sessions', () => {
    expect(parseAdyenSetupSession(null)).toBeNull();
    expect(parseAdyenSetupSession('adyen')).toBeNull();
    expect(parseAdyenSetupSession(session({ provider: 'stripe' }))).toBeNull();
    expect(parseAdyenSetupSession(session({ clientKey: '' }))).toBeNull();
    expect(parseAdyenSetupSession(session({ environment: 'prod' }))).toBeNull();
    expect(parseAdyenSetupSession(session({ countryCode: 1 }))).toBeNull();
    expect(parseAdyenSetupSession(session({ currency: undefined }))).toBeNull();
    expect(parseAdyenSetupSession(session({ paymentMethodsResponse: null }))).toBeNull();
    expect(
      parseAdyenSetupSession(session({ paymentMethodsResponse: { paymentMethods: 'x' } })),
    ).toBeNull();
  });
});

describe('return URL and scheme', () => {
  it('builds the return URL on the app scheme', () => {
    expect(adyenReturnUrl('evtivity')).toBe('evtivity://payments/adyen');
  });

  it('reads the configured scheme or falls back', () => {
    expect(appScheme('mybrand', 'evtivity')).toBe('mybrand');
    expect(appScheme(['', 'second'], 'evtivity')).toBe('second');
    expect(appScheme([], 'evtivity')).toBe('evtivity');
    expect(appScheme('', 'evtivity')).toBe('evtivity');
    expect(appScheme(undefined, 'evtivity')).toBe('evtivity');
  });
});

describe('adyenSubmitRequest', () => {
  const paymentMethod = { type: 'scheme', encryptedCardNumber: 'enc' };

  it('sends the card, the setup currency, the platform and the SDK return URL', () => {
    expect(
      adyenSubmitRequest(
        {
          paymentMethod,
          browserInfo: { userAgent: 'iPhone' },
          returnUrl: 'evtivity://payments/adyen',
        },
        'EUR',
        'ios',
      ),
    ).toEqual({
      payload: { paymentMethod, browserInfo: { userAgent: 'iPhone' }, currency: 'EUR' },
      browser: {
        platform: 'ios',
        returnUrl: 'evtivity://payments/adyen',
        info: { userAgent: 'iPhone' },
      },
    });
  });

  it('omits the browser info the SDK did not collect', () => {
    expect(
      adyenSubmitRequest(
        { paymentMethod, returnUrl: 'adyencheckout://com.evtivity.driver' },
        'USD',
        'android',
      ),
    ).toEqual({
      payload: { paymentMethod, currency: 'USD' },
      browser: { platform: 'android', returnUrl: 'adyencheckout://com.evtivity.driver' },
    });
  });
});

describe('adyenAction', () => {
  it('returns the Adyen action data', () => {
    const data = { type: 'redirect', url: 'https://test.adyen.com/3ds' };
    expect(adyenAction({ provider: 'adyen', data })).toBe(data);
  });

  it('refuses another provider or malformed data', () => {
    expect(adyenAction({ provider: 'simulated', data: { type: 'redirect' } })).toBeNull();
    expect(adyenAction({ provider: 'adyen', data: null })).toBeNull();
    expect(adyenAction({ provider: 'adyen', data: { url: 'x' } })).toBeNull();
  });
});
