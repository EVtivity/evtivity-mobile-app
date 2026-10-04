// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import {
  formatTestCardNumber,
  parseSimulatedChallenge,
  parseSimulatedTestCards,
  simulatedScenarioLabelKey,
} from '@/lib/simulated-cards';

describe('parseSimulatedTestCards', () => {
  it('returns the well-formed cards and drops extra fields', () => {
    expect(
      parseSimulatedTestCards({
        provider: 'simulated',
        testCards: [
          { number: '4242424242424242', label: 'Approve (Visa)', scenario: 'approve', x: 1 },
          { number: '4000002500003155', label: 'Requires authentication', scenario: 'action' },
        ],
      }),
    ).toEqual([
      { number: '4242424242424242', label: 'Approve (Visa)', scenario: 'approve' },
      { number: '4000002500003155', label: 'Requires authentication', scenario: 'action' },
    ]);
  });

  it('drops malformed entries', () => {
    expect(
      parseSimulatedTestCards({
        provider: 'simulated',
        testCards: [
          null,
          '4242',
          { number: '', label: 'x', scenario: 'approve' },
          { number: '4242424242424242', label: 1, scenario: 'approve' },
          { number: '4242424242424242', label: 'x', scenario: null },
          { number: 4242, label: 'x', scenario: 'approve' },
        ],
      }),
    ).toEqual([]);
  });

  it('is empty when the config has no card list', () => {
    expect(parseSimulatedTestCards({ provider: 'simulated' })).toEqual([]);
    expect(parseSimulatedTestCards({ provider: 'simulated', testCards: 'x' })).toEqual([]);
  });
});

describe('simulatedScenarioLabelKey', () => {
  it('names the translation of a known scenario', () => {
    expect(simulatedScenarioLabelKey('action')).toBe('payments.testScenario.action');
  });

  it('is null for a scenario this build does not know', () => {
    expect(simulatedScenarioLabelKey('future')).toBeNull();
  });
});

describe('formatTestCardNumber', () => {
  it('groups the number in blocks of four', () => {
    expect(formatTestCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
    expect(formatTestCardNumber('424242')).toBe('4242 42');
  });
});

describe('parseSimulatedChallenge', () => {
  it('returns the method id of a card setup challenge', () => {
    expect(
      parseSimulatedChallenge({
        provider: 'simulated',
        data: { challenge: 'method_setup', methodId: 'sim_pm_action_3155_abc' },
      }),
    ).toEqual({ methodId: 'sim_pm_action_3155_abc' });
  });

  it('is null for another provider', () => {
    expect(
      parseSimulatedChallenge({
        provider: 'stripe',
        data: { challenge: 'method_setup', methodId: 'pm_1' },
      }),
    ).toBeNull();
  });

  it('is null for missing or malformed data', () => {
    expect(parseSimulatedChallenge({ provider: 'simulated', data: null })).toBeNull();
    expect(parseSimulatedChallenge({ provider: 'simulated', data: 'x' })).toBeNull();
    expect(
      parseSimulatedChallenge({
        provider: 'simulated',
        data: { challenge: 'hold', methodId: 'm' },
      }),
    ).toBeNull();
    expect(
      parseSimulatedChallenge({
        provider: 'simulated',
        data: { challenge: 'method_setup', methodId: '' },
      }),
    ).toBeNull();
    expect(
      parseSimulatedChallenge({ provider: 'simulated', data: { challenge: 'method_setup' } }),
    ).toBeNull();
  });
});
