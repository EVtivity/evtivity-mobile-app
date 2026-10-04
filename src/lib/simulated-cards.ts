// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Pure parsing for the test payment provider ('simulated'). Its setup session
// lists the only card numbers it accepts, each with the outcome it simulates,
// and a card that requires authentication returns a challenge action whose
// result goes back through setup/details.

import type { ClientConfig } from './payment-provider';

export interface SimulatedTestCard {
  number: string;
  /** English label from the server, shown when the app has no translation for the scenario. */
  label: string;
  scenario: string;
}

/** Scenarios this build has translated labels for (payments.testScenario.*). */
export const SIMULATED_SCENARIOS: readonly string[] = [
  'approve',
  'decline',
  'nofunds',
  'chargefail',
  'action',
  'partial',
  'capfail',
  'adjfail',
  'refundfail',
  'dispute',
  'random',
];

function isTestCard(value: unknown): value is SimulatedTestCard {
  if (value == null || typeof value !== 'object') return false;
  const card = value as Record<string, unknown>;
  return (
    typeof card.number === 'string' &&
    card.number.length > 0 &&
    typeof card.label === 'string' &&
    typeof card.scenario === 'string'
  );
}

/** The test cards of a simulated setup session or client config; malformed entries are dropped. */
export function parseSimulatedTestCards(config: ClientConfig): SimulatedTestCard[] {
  const cards = config.testCards;
  if (!Array.isArray(cards)) return [];
  return cards.filter(isTestCard).map(({ number, label, scenario }) => ({
    number,
    label,
    scenario,
  }));
}

/** i18n key of a scenario label, or null for a scenario this build does not know. */
export function simulatedScenarioLabelKey(scenario: string): string | null {
  return SIMULATED_SCENARIOS.includes(scenario) ? `payments.testScenario.${scenario}` : null;
}

/** Groups a card number in blocks of four for display. */
export function formatTestCardNumber(number: string): string {
  return number.replace(/(.{4})(?=.)/g, '$1 ');
}

/** The method id of a simulated card setup challenge, or null when the action is not one. */
export function parseSimulatedChallenge(action: {
  provider: string;
  data: unknown;
}): { methodId: string } | null {
  if (action.provider !== 'simulated') return null;
  const data = action.data;
  if (data == null || typeof data !== 'object') return null;
  const { challenge, methodId } = data as Record<string, unknown>;
  if (challenge !== 'method_setup' || typeof methodId !== 'string' || methodId.length === 0) {
    return null;
  }
  return { methodId };
}
