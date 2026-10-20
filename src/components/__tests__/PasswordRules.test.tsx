// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The ui barrel pulls in reanimated (no native worklets under jest). Load only
// the primitives this component renders.
jest.mock('@/components/ui', () => ({
  Text: jest.requireActual('@/components/ui/Text').Text,
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import { initTestI18n } from '@/test-utils/i18n';
import { PasswordRules } from '@/components/PasswordRules';
import { DEFAULT_PASSWORD_POLICY } from '@/lib/password-policy';
import de from '@/lib/i18n/de.json';
import en from '@/lib/i18n/en.json';
import es from '@/lib/i18n/es.json';
import ko from '@/lib/i18n/ko.json';
import zh from '@/lib/i18n/zh.json';
import zhTW from '@/lib/i18n/zh-TW.json';

beforeAll(async () => {
  await initTestI18n();
});

describe('PasswordRules', () => {
  it('lists the default rules with the minimum length', async () => {
    const { getByText, queryByText } = await render(
      <PasswordRules password="" policy={DEFAULT_PASSWORD_POLICY} />,
    );
    expect(getByText('Password needs:')).toBeTruthy();
    expect(getByText('at least 12 characters')).toBeTruthy();
    expect(getByText('an uppercase letter')).toBeTruthy();
    expect(getByText('a lowercase letter')).toBeTruthy();
    expect(getByText('a number')).toBeTruthy();
    expect(queryByText('a special character')).toBeNull();
    expect(queryByText('at most 128 characters')).toBeNull();
  });

  it('follows the live policy: its minimum length and the symbol rule', async () => {
    const { getByText, queryByText } = await render(
      <PasswordRules
        password=""
        policy={{
          minLength: 16,
          requireUppercase: false,
          requireLowercase: true,
          requireNumber: true,
          requireSymbol: true,
        }}
      />,
    );
    expect(getByText('at least 16 characters')).toBeTruthy();
    expect(getByText('a special character')).toBeTruthy();
    expect(queryByText('an uppercase letter')).toBeNull();
  });

  it('shows the maximum length only once the password exceeds it', async () => {
    const { getByTestId } = await render(
      <PasswordRules
        password={`Abc1${'a'.repeat(125)}`}
        policy={DEFAULT_PASSWORD_POLICY}
        testID="rules"
      />,
    );
    expect(getByTestId('rules-maxLength')).toHaveAccessibleName('at most 128 characters, not met');
  });

  it('marks the rules a WEAK_PASSWORD reply named as unmet', async () => {
    const { getByTestId } = await render(
      <PasswordRules
        password="Abcdefghijk1"
        policy={DEFAULT_PASSWORD_POLICY}
        serverMissing={['symbol']}
        testID="rules"
      />,
    );
    expect(getByTestId('rules-number')).toHaveAccessibleName('a number, met');
    expect(getByTestId('rules-symbol')).toHaveAccessibleName('a special character, not met');
  });

  it('marks the rules the password meets', async () => {
    const { getByTestId } = await render(
      <PasswordRules password="Abc1" policy={DEFAULT_PASSWORD_POLICY} testID="rules" />,
    );
    expect(getByTestId('rules-minLength')).toHaveAccessibleName('at least 12 characters, not met');
    expect(getByTestId('rules-uppercase')).toHaveAccessibleName('an uppercase letter, met');
    expect(getByTestId('rules-lowercase')).toHaveAccessibleName('a lowercase letter, met');
    expect(getByTestId('rules-number')).toHaveAccessibleName('a number, met');
  });
});

describe('password and sign-in error copy', () => {
  const locales = { de, en, es, ko, zh, 'zh-TW': zhTW };

  it.each(Object.entries(locales))('%s has every password rule and error message', (_, l) => {
    expect(l.auth.passwordNeeds).toBeTruthy();
    expect(l.auth.passwordMissing).toContain('{{rules}}');
    expect(l.auth.passwordRule.minLength).toContain('{{min}}');
    expect(l.auth.passwordRule.uppercase).toBeTruthy();
    expect(l.auth.passwordRule.lowercase).toBeTruthy();
    expect(l.auth.passwordRule.number).toBeTruthy();
    expect(l.auth.passwordRule.symbol).toBeTruthy();
    expect(l.auth.passwordRule.maxLength).toContain('{{max}}');
    expect(l.auth.passwordRuleMet).toBeTruthy();
    expect(l.auth.passwordRuleNotMet).toBeTruthy();
    expect(l.errors.WEAK_PASSWORD).toBeTruthy();
    expect(l.errors.ATTESTATION_FAILED).toBeTruthy();
  });
});
