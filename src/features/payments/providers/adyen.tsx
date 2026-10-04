// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import {
  AdyenCheckout,
  ErrorCode,
  useAdyenCheckout,
  type AdyenActionComponent,
  type AdyenComponent,
  type AdyenError,
  type Configuration,
  type PaymentAction,
  type PaymentDetailsData,
  type PaymentMethodData,
} from '@adyen/react-native';
import { defaultBrand } from '@brands/index';
import { useToast } from '@/components/ui';
import { api } from '@/lib/api';
import {
  adyenAction,
  adyenReturnUrl,
  adyenSubmitRequest,
  appScheme,
  parseAdyenSetupSession,
  type AdyenSetupSession,
} from '@/lib/adyen-checkout';
import type { ClientConfig } from '@/lib/payment-provider';
import {
  newSetupAttemptId,
  submitMethodSetup,
  submitMethodSetupDetails,
  useInvalidatePaymentMethods,
  type SetupStepResponse,
} from '../api';
import type { AddCardResult, MobilePaymentModule } from '../registry';

// Adyen through the native Adyen SDK (@adyen/react-native, Advanced flow).
// The API starts the setup (setup-intent: the Adyen client key, environment
// and /paymentMethods answer), the SDK's card form collects the card, and the
// encrypted card goes to setup/submit with the app platform and the SDK's
// return URL. A card that needs 3D Secure answers an action the SDK runs
// (redirect to the issuer and back into the app); its result goes to
// setup/details with the same attempt id. The SDK is a native module: Expo Go
// and builds without it cannot add an Adyen card.

const PROVIDER_ID = 'adyen';

interface SetupIntentResponse {
  provider: string;
  session: unknown;
}

interface Attempt {
  session: AdyenSetupSession;
  attemptId: string;
  settle: (result: AddCardResult | Error) => void;
}

interface AdyenState {
  attempt: Attempt | null;
  begin(attempt: Attempt): void;
  end(): void;
}

const AdyenContext = React.createContext<AdyenState | null>(null);

function useAdyenState(): AdyenState {
  const state = React.useContext(AdyenContext);
  if (state == null) throw new Error('The Adyen payment module needs its Provider');
  return state;
}

/** True when this build includes the native Adyen SDK (not in Expo Go). */
export function isAdyenNativeAvailable(): boolean {
  return NativeModules.AdyenDropIn != null;
}

// Holds the running attempt, so the add-card hook (in the card list) and the
// Overlay that mounts the SDK share it.
function AdyenProvider({
  children,
}: {
  config: ClientConfig;
  children: React.ReactNode;
}): React.JSX.Element {
  const [attempt, setAttempt] = React.useState<Attempt | null>(null);
  const attemptRef = React.useRef<Attempt | null>(null);

  const value = React.useMemo<AdyenState>(
    () => ({
      attempt,
      begin: (next) => {
        attemptRef.current = next;
        setAttempt(next);
      },
      end: () => {
        attemptRef.current = null;
        setAttempt(null);
      },
    }),
    [attempt],
  );

  // Leaving the screen mid-flow settles the waiting hook as cancelled.
  React.useEffect(() => () => attemptRef.current?.settle('cancelled'), []);

  return <AdyenContext.Provider value={value}>{children}</AdyenContext.Provider>;
}

// Opens the card form once the SDK has the payment methods. Drop-in with the
// card as its only method skips the list and shows the card form directly.
function StartCardForm(): null {
  const { start, isReady } = useAdyenCheckout();
  const started = React.useRef(false);
  React.useEffect(() => {
    if (isReady && !started.current) {
      started.current = true;
      start('dropIn');
    }
  }, [isReady, start]);
  return null;
}

function platform(): 'ios' | 'android' {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

function AdyenOverlay(): React.JSX.Element | null {
  const { t, i18n } = useTranslation();
  const state = useAdyenState();
  const attempt = state.attempt;

  // Settles the attempt once and closes the SDK.
  const settledRef = React.useRef<Attempt | null>(null);
  const finish = React.useCallback(
    (component: AdyenComponent, result: AddCardResult | Error): void => {
      if (attempt == null || settledRef.current === attempt) return;
      settledRef.current = attempt;
      component.hide(result === 'added');
      state.end();
      attempt.settle(result);
    },
    [attempt, state],
  );

  const onStep = React.useCallback(
    (step: SetupStepResponse, component: AdyenActionComponent): void => {
      if (step.status === 'saved') {
        finish(component, 'added');
        return;
      }
      const action = adyenAction(step.action);
      if (action == null) {
        finish(component, new Error('Unexpected card setup action'));
        return;
      }
      component.handle(action as unknown as PaymentAction);
    },
    [finish],
  );

  const onSubmit = React.useCallback(
    (data: PaymentMethodData, component: AdyenActionComponent): void => {
      if (attempt == null) return;
      const request = adyenSubmitRequest(data, attempt.session.currency, platform());
      submitMethodSetup(PROVIDER_ID, attempt.attemptId, request.payload, request.browser)
        .then((step) => onStep(step, component))
        .catch((err: unknown) =>
          finish(component, err instanceof Error ? err : new Error(String(err))),
        );
    },
    [attempt, onStep, finish],
  );

  const onAdditionalDetails = React.useCallback(
    (data: PaymentDetailsData, component: AdyenActionComponent): void => {
      if (attempt == null) return;
      submitMethodSetupDetails(PROVIDER_ID, attempt.attemptId, data)
        .then((step) => onStep(step, component))
        .catch((err: unknown) =>
          finish(component, err instanceof Error ? err : new Error(String(err))),
        );
    },
    [attempt, onStep, finish],
  );

  const onError = React.useCallback(
    (error: AdyenError, component: AdyenComponent): void => {
      finish(
        component,
        error.errorCode === (ErrorCode.canceled as string) ? 'cancelled' : new Error(error.message),
      );
    },
    [finish],
  );

  const config = React.useMemo<Configuration | null>(() => {
    if (attempt == null) return null;
    const { session } = attempt;
    return {
      environment: session.environment,
      clientKey: session.clientKey,
      countryCode: session.countryCode,
      locale: i18n.language,
      returnUrl: adyenReturnUrl(appScheme(Constants.expoConfig?.scheme, defaultBrand.scheme)),
      dropin: { skipListWhenSinglePaymentMethod: true, title: t('payments.addCard') },
      // Every card added here is stored, so the SDK shows no "save card" switch.
      card: { holderNameRequired: false, showStorePaymentField: false },
    };
  }, [attempt, i18n.language, t]);

  if (attempt == null || config == null) return null;
  return (
    <AdyenCheckout
      config={config}
      paymentMethods={attempt.session.paymentMethods}
      onSubmit={onSubmit}
      onAdditionalDetails={onAdditionalDetails}
      onError={onError}
    >
      <StartCardForm />
    </AdyenCheckout>
  );
}

// Starts the setup with the API and opens the SDK's card form. Resolves
// 'added' when the card is saved, 'cancelled' when the driver closes the form
// (or the build has no Adyen SDK, with a message), and throws on a failure
// (a refused card is a 400 PAYMENT_FAILED ApiError).
function useAdyenAddCard(_config: ClientConfig): () => Promise<AddCardResult> {
  const state = useAdyenState();
  const invalidate = useInvalidatePaymentMethods();
  const toast = useToast();
  const { t } = useTranslation();

  return async (): Promise<AddCardResult> => {
    if (!isAdyenNativeAvailable()) {
      toast.show(t('paymentProviders.adyen.unavailable'), 'error');
      return 'cancelled';
    }
    const setup = await api.post<SetupIntentResponse>('/v1/portal/payment-methods/setup-intent');
    const session = parseAdyenSetupSession(setup.session);
    if (session == null) throw new Error('The Adyen setup session is incomplete');

    const result = await new Promise<AddCardResult | Error>((settle) => {
      state.begin({ session, attemptId: newSetupAttemptId(), settle });
    });
    if (result instanceof Error) throw result;
    if (result === 'added') await invalidate();
    return result;
  };
}

export const adyenModule: MobilePaymentModule = {
  id: PROVIDER_ID,
  Provider: AdyenProvider,
  useAddCard: useAdyenAddCard,
  Overlay: AdyenOverlay,
};
