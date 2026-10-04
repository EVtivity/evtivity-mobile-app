// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CreditCard } from '@/components/icons';
import { Badge, Button, ListRow, Sheet, Text } from '@/components/ui';
import { api } from '@/lib/api';
import type { ClientConfig } from '@/lib/payment-provider';
import {
  formatTestCardNumber,
  parseSimulatedChallenge,
  parseSimulatedTestCards,
  simulatedScenarioLabelKey,
  type SimulatedTestCard,
} from '@/lib/simulated-cards';
import { hsl } from '@/lib/theme';
import {
  newSetupAttemptId,
  submitMethodSetup,
  submitMethodSetupDetails,
  useInvalidatePaymentMethods,
} from '../api';
import type { AddCardResult, MobilePaymentModule } from '../registry';

// The test payment provider. No card data is entered: the driver picks one of
// the allowlisted test card numbers the setup session lists, and the number
// decides the outcome (approve, decline, challenge, ...). A card that requires
// authentication returns a challenge the driver approves or fails here.

const PROVIDER_ID = 'simulated';

type ChallengeOutcome = 'approve' | 'fail';

// The web channel setup step: starts the setup with the active provider and
// returns its session (simulated: the test card list).
interface SetupIntentResponse {
  provider: string;
  customerId: string;
  session: ClientConfig & { customerId: string };
}

type Prompt =
  | { kind: 'cards'; cards: SimulatedTestCard[]; resolve: (number: string | null) => void }
  | { kind: 'challenge'; resolve: (outcome: ChallengeOutcome | null) => void };

interface Prompts {
  prompt: Prompt | null;
  /** Shows the test card list; resolves the chosen number, or null when dismissed. */
  chooseCard(cards: SimulatedTestCard[]): Promise<string | null>;
  /** Shows the authentication challenge; resolves the outcome, or null when dismissed. */
  challenge(): Promise<ChallengeOutcome | null>;
  /** Closes the open prompt with its dismissed result. */
  dismiss(): void;
  /** Closes the open prompt; the caller resolves it. */
  clear(): void;
}

const PromptsContext = React.createContext<Prompts | null>(null);

function usePrompts(): Prompts {
  const prompts = React.useContext(PromptsContext);
  if (prompts == null) throw new Error('The simulated payment module needs its Provider');
  return prompts;
}

// Holds the prompt the add-card hook is waiting on, so the hook (in the card
// list) and the Overlay (rendered by the screen) share it.
function SimulatedProvider({
  children,
}: {
  config: ClientConfig;
  children: React.ReactNode;
}): React.JSX.Element {
  const [prompt, setPrompt] = React.useState<Prompt | null>(null);
  const promptRef = React.useRef<Prompt | null>(null);

  const open = React.useCallback((next: Prompt | null): void => {
    promptRef.current = next;
    setPrompt(next);
  }, []);

  const dismiss = React.useCallback((): void => {
    const current = promptRef.current;
    open(null);
    current?.resolve(null);
  }, [open]);

  // Leaving the screen mid-flow settles the waiting hook as cancelled.
  React.useEffect(() => () => promptRef.current?.resolve(null), []);

  const value = React.useMemo<Prompts>(
    () => ({
      prompt,
      chooseCard: (cards) =>
        new Promise<string | null>((resolve) => open({ kind: 'cards', cards, resolve })),
      challenge: () =>
        new Promise<ChallengeOutcome | null>((resolve) => open({ kind: 'challenge', resolve })),
      dismiss,
      clear: () => open(null),
    }),
    [prompt, open, dismiss],
  );

  return <PromptsContext.Provider value={value}>{children}</PromptsContext.Provider>;
}

function TestModeNotice(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <View className="gap-2">
      <Badge label={t('payments.testMode')} variant="warning" />
      <Text variant="muted">{t('payments.testModeHint')}</Text>
    </View>
  );
}

function SimulatedOverlay(): React.JSX.Element | null {
  const { t } = useTranslation();
  const prompts = usePrompts();
  const prompt = prompts.prompt;
  if (prompt == null) return null;

  if (prompt.kind === 'cards') {
    const choose = (number: string): void => {
      prompts.clear();
      prompt.resolve(number);
    };
    return (
      <Sheet visible onClose={prompts.dismiss} title={t('payments.testCardsTitle')}>
        <TestModeNotice />
        <ScrollView className="max-h-96">
          {prompt.cards.map((card) => {
            const key = simulatedScenarioLabelKey(card.scenario);
            return (
              <ListRow
                key={card.number}
                testID={`simulated-card-${card.number}`}
                left={<CreditCard size={20} color={hsl('foreground')} />}
                title={key != null ? t(key) : card.label}
                subtitle={formatTestCardNumber(card.number)}
                onPress={() => choose(card.number)}
              />
            );
          })}
        </ScrollView>
      </Sheet>
    );
  }

  const settle = (outcome: ChallengeOutcome): void => {
    prompts.clear();
    prompt.resolve(outcome);
  };
  return (
    <Sheet visible onClose={prompts.dismiss} title={t('payments.challengeTitle')}>
      <TestModeNotice />
      <Text>{t('payments.challengeMessage')}</Text>
      <Button
        testID="simulated-challenge-approve"
        title={t('payments.challengeApprove')}
        onPress={() => settle('approve')}
      />
      <Button
        testID="simulated-challenge-fail"
        title={t('payments.challengeFail')}
        variant="outline"
        onPress={() => settle('fail')}
      />
    </Sheet>
  );
}

// Starts the setup, lets the driver pick a test card, saves it through
// setup/submit and, for a card that requires authentication, sends the
// challenge result through setup/details with the same attempt id. Returns
// 'cancelled' when the driver dismisses a sheet, throws on a failure (a
// refused card is a 400 PAYMENT_FAILED ApiError).
function useSimulatedAddCard(_config: ClientConfig): () => Promise<AddCardResult> {
  const prompts = usePrompts();
  const invalidate = useInvalidatePaymentMethods();

  return async (): Promise<AddCardResult> => {
    const attemptId = newSetupAttemptId();
    const setup = await api.post<SetupIntentResponse>('/v1/portal/payment-methods/setup-intent');
    const cards = parseSimulatedTestCards(setup.session);
    if (cards.length === 0) throw new Error('The test provider listed no test cards');

    const number = await prompts.chooseCard(cards);
    if (number == null) return 'cancelled';

    let result = await submitMethodSetup(PROVIDER_ID, attemptId, { testCard: number });
    if (result.status === 'action_required') {
      const challenge = parseSimulatedChallenge(result.action);
      if (challenge == null) throw new Error('Unexpected card setup action');
      const outcome = await prompts.challenge();
      if (outcome == null) return 'cancelled';
      result = await submitMethodSetupDetails(PROVIDER_ID, attemptId, {
        methodId: challenge.methodId,
        outcome,
      });
    }
    if (result.status !== 'saved') throw new Error('Unexpected card setup action');

    await invalidate();
    return 'added';
  };
}

export const simulatedModule: MobilePaymentModule = {
  id: PROVIDER_ID,
  Provider: SimulatedProvider,
  useAddCard: useSimulatedAddCard,
  Overlay: SimulatedOverlay,
};
