// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Pure helpers for the Adyen card module (providers/adyen.tsx): the setup
// session the API returns, the configuration of the native Adyen SDK, and the
// setup/submit body. No SDK import, so they run under jest without a device.

/** Environments of @adyen/react-native (Configuration.environment). */
export type AdyenEnvironment =
  'test' | 'live-eu' | 'live-us' | 'live-au' | 'live-apse' | 'live-in' | 'live-nea';

const NATIVE_ENVIRONMENTS: readonly AdyenEnvironment[] = [
  'test',
  'live-eu',
  'live-us',
  'live-au',
  'live-apse',
  'live-in',
  'live-nea',
];

/**
 * The native SDK environment for the API's client environment. The API uses
 * Adyen Web names, where Europe is plain `live`; the native SDK calls it
 * `live-eu`.
 */
export function adyenNativeEnvironment(value: unknown): AdyenEnvironment | null {
  if (value === 'live') return 'live-eu';
  return NATIVE_ENVIRONMENTS.find((env) => env === value) ?? null;
}

export interface AdyenPaymentMethod {
  type: string;
  name: string;
  [key: string]: unknown;
}

/** The setup session of POST /v1/portal/payment-methods/setup-intent for Adyen. */
export interface AdyenSetupSession {
  clientKey: string;
  environment: AdyenEnvironment;
  countryCode: string;
  currency: string;
  /** Only the card entry: no stored cards, so Drop-in opens the card form directly. */
  paymentMethods: { paymentMethods: AdyenPaymentMethod[] };
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** The Adyen session of a setup-intent answer, or null when it is not a usable Adyen session. */
export function parseAdyenSetupSession(session: unknown): AdyenSetupSession | null {
  if (session == null || typeof session !== 'object') return null;
  const s = session as Record<string, unknown>;
  if (s.provider !== 'adyen') return null;
  const clientKey = nonEmptyString(s.clientKey);
  const environment = adyenNativeEnvironment(s.environment);
  const countryCode = nonEmptyString(s.countryCode);
  const currency = nonEmptyString(s.currency);
  const response = s.paymentMethodsResponse as { paymentMethods?: unknown } | null | undefined;
  const methods = Array.isArray(response?.paymentMethods) ? response.paymentMethods : [];
  const scheme = methods.filter(
    (m): m is AdyenPaymentMethod =>
      m != null &&
      typeof m === 'object' &&
      (m as { type?: unknown }).type === 'scheme' &&
      typeof (m as { name?: unknown }).name === 'string',
  );
  if (
    clientKey == null ||
    environment == null ||
    countryCode == null ||
    currency == null ||
    scheme.length === 0
  ) {
    return null;
  }
  return {
    clientKey,
    environment,
    countryCode,
    currency,
    paymentMethods: { paymentMethods: scheme },
  };
}

/**
 * The return URL the native SDK registers for redirect 3D Secure: the app's
 * own custom scheme (iOS; the API accepts it when the scheme is listed in the
 * operator's mobile.app.urlSchemes setting). On Android the Adyen SDK replaces
 * it with adyencheckout://<application id>.
 */
export function adyenReturnUrl(scheme: string): string {
  return `${scheme}://payments/adyen`;
}

/** The app scheme from the Expo config (a string or a list), else the fallback. */
export function appScheme(configured: unknown, fallback: string): string {
  if (typeof configured === 'string' && configured.length > 0) return configured;
  if (Array.isArray(configured)) {
    const first = configured.find((s): s is string => typeof s === 'string' && s.length > 0);
    if (first != null) return first;
  }
  return fallback;
}

/** The onSubmit data of the native SDK (PaymentMethodData). */
export interface AdyenSubmitData {
  paymentMethod: { type: string; [key: string]: unknown };
  browserInfo?: unknown;
  returnUrl: string;
}

export type AppPlatform = 'ios' | 'android';

/** The setup/submit payload and browser for the API. */
export function adyenSubmitRequest(
  data: AdyenSubmitData,
  currency: string,
  platform: AppPlatform,
): {
  payload: {
    paymentMethod: AdyenSubmitData['paymentMethod'];
    browserInfo?: unknown;
    currency: string;
  };
  browser: { platform: AppPlatform; returnUrl: string; info?: unknown };
} {
  const hasInfo = data.browserInfo != null;
  return {
    payload: {
      paymentMethod: data.paymentMethod,
      ...(hasInfo ? { browserInfo: data.browserInfo } : {}),
      currency,
    },
    browser: {
      platform,
      returnUrl: data.returnUrl,
      ...(hasInfo ? { info: data.browserInfo } : {}),
    },
  };
}

/** The Adyen action of an action_required answer, or null when it is not one. */
export function adyenAction(action: {
  provider: string;
  data: unknown;
}): Record<string, unknown> | null {
  if (action.provider !== 'adyen') return null;
  const data = action.data;
  if (
    data == null ||
    typeof data !== 'object' ||
    typeof (data as { type?: unknown }).type !== 'string'
  ) {
    return null;
  }
  return data as Record<string, unknown>;
}
