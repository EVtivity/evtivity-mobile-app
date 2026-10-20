// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import {
  DEFAULT_PASSWORD_POLICY,
  PASSWORD_MAX_LENGTH,
  PASSWORD_RULE_IDS,
  activePasswordRules,
  knownPasswordRules,
  missingPasswordRules,
  normalizePasswordPolicy,
  passwordChecklist,
  passwordRuleResults,
  policyFromSecurityPublic,
  type PasswordPolicy,
} from '@/lib/password-policy';

const ALL_ON: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: true,
};

describe('password policy engine', () => {
  it('defaults to the CSMS rules: 12 characters, uppercase, lowercase, number, no symbol', () => {
    expect(DEFAULT_PASSWORD_POLICY).toEqual({
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSymbol: false,
    });
    expect(PASSWORD_MAX_LENGTH).toBe(128);
    expect(PASSWORD_RULE_IDS).toEqual([
      'minLength',
      'uppercase',
      'lowercase',
      'number',
      'symbol',
      'maxLength',
    ]);
  });

  it('lists the rules the policy turns on, the minimum length always', () => {
    expect(activePasswordRules(DEFAULT_PASSWORD_POLICY)).toEqual([
      'minLength',
      'uppercase',
      'lowercase',
      'number',
    ]);
    expect(activePasswordRules(ALL_ON)).toEqual([
      'minLength',
      'uppercase',
      'lowercase',
      'number',
      'symbol',
    ]);
    expect(
      activePasswordRules({
        minLength: 8,
        requireUppercase: false,
        requireLowercase: false,
        requireNumber: false,
        requireSymbol: false,
      }),
    ).toEqual(['minLength']);
  });

  it('checks each rule on its own', () => {
    const p = DEFAULT_PASSWORD_POLICY;
    expect(missingPasswordRules('', p)).toEqual(['minLength', 'uppercase', 'lowercase', 'number']);
    expect(missingPasswordRules('abcdefghijk1', p)).toEqual(['uppercase']);
    expect(missingPasswordRules('ABCDEFGHIJK1', p)).toEqual(['lowercase']);
    expect(missingPasswordRules('Abcdefghijkl', p)).toEqual(['number']);
    expect(missingPasswordRules('Abcdefghij1', p)).toEqual(['minLength']);
    expect(missingPasswordRules('Abcdefghijk1', p)).toEqual([]);
  });

  it('counts printable ASCII punctuation as a symbol, not a space or a non-ASCII character', () => {
    expect(missingPasswordRules('Abcdefg1', ALL_ON)).toEqual(['symbol']);
    expect(missingPasswordRules('Abcdef g1', ALL_ON)).toEqual(['symbol']);
    expect(missingPasswordRules('Abcdefé1', ALL_ON)).toEqual(['symbol']);
    for (const symbol of ['!', '/', ':', '@', '[', '`', '{', '~']) {
      expect(missingPasswordRules(`Abcdefg1${symbol}`, ALL_ON)).toEqual([]);
    }
  });

  it('reports the maximum length last, only when exceeded', () => {
    const long = `A1${'a'.repeat(PASSWORD_MAX_LENGTH - 1)}`;
    expect(missingPasswordRules(long.slice(0, PASSWORD_MAX_LENGTH), ALL_ON)).toEqual(['symbol']);
    expect(missingPasswordRules(long, ALL_ON)).toEqual(['symbol', 'maxLength']);
  });

  it('reports each active rule in display order with its state', () => {
    expect(passwordRuleResults('Ab1', DEFAULT_PASSWORD_POLICY)).toEqual([
      { rule: 'minLength', met: false },
      { rule: 'uppercase', met: true },
      { rule: 'lowercase', met: true },
      { rule: 'number', met: true },
    ]);
  });
});

describe('normalizePasswordPolicy', () => {
  it('takes the default for a missing or mistyped field', () => {
    expect(normalizePasswordPolicy({})).toEqual(DEFAULT_PASSWORD_POLICY);
    expect(
      normalizePasswordPolicy({ minLength: '20', requireUppercase: 'false', requireSymbol: 1 }),
    ).toEqual(DEFAULT_PASSWORD_POLICY);
  });

  it('truncates and clamps the minimum length to 8 through 64', () => {
    expect(normalizePasswordPolicy({ minLength: 3 }).minLength).toBe(8);
    expect(normalizePasswordPolicy({ minLength: 99 }).minLength).toBe(64);
    expect(normalizePasswordPolicy({ minLength: 14.9 }).minLength).toBe(14);
    expect(normalizePasswordPolicy({ minLength: Number.NaN }).minLength).toBe(12);
  });

  it('keeps valid values', () => {
    expect(normalizePasswordPolicy({ ...ALL_ON, minLength: 16 })).toEqual({
      ...ALL_ON,
      minLength: 16,
    });
  });
});

describe('policyFromSecurityPublic', () => {
  it('reads passwordPolicy from the public security response', () => {
    expect(
      policyFromSecurityPublic({ recaptchaEnabled: false, passwordPolicy: { ...ALL_ON } }),
    ).toEqual(ALL_ON);
  });

  it('falls back to the default for an older server without passwordPolicy', () => {
    expect(policyFromSecurityPublic({ recaptchaEnabled: false })).toEqual(DEFAULT_PASSWORD_POLICY);
    expect(policyFromSecurityPublic(null)).toEqual(DEFAULT_PASSWORD_POLICY);
    expect(policyFromSecurityPublic({ passwordPolicy: [] })).toEqual(DEFAULT_PASSWORD_POLICY);
  });
});

describe('knownPasswordRules', () => {
  it('keeps known rule ids in display order without duplicates', () => {
    expect(knownPasswordRules(['symbol', 'bogus', 'minLength', 'symbol', 3])).toEqual([
      'minLength',
      'symbol',
    ]);
    expect(knownPasswordRules(undefined)).toEqual([]);
  });
});

describe('passwordChecklist', () => {
  it('shows the policy rules, not the maximum length while within it', () => {
    expect(passwordChecklist('Abcdefg1!', ALL_ON).map(({ rule }) => rule)).toEqual([
      'minLength',
      'uppercase',
      'lowercase',
      'number',
      'symbol',
    ]);
  });

  it('adds the maximum length, unmet, once the password exceeds it', () => {
    const list = passwordChecklist(`A1!${'a'.repeat(PASSWORD_MAX_LENGTH)}`, ALL_ON);
    expect(list[list.length - 1]).toEqual({ rule: 'maxLength', met: false });
  });

  it('marks the rules a WEAK_PASSWORD reply named as unmet, also ones the app did not know', () => {
    expect(passwordChecklist('Abcdefghijk1', DEFAULT_PASSWORD_POLICY, ['symbol'])).toEqual([
      { rule: 'minLength', met: true },
      { rule: 'uppercase', met: true },
      { rule: 'lowercase', met: true },
      { rule: 'number', met: true },
      { rule: 'symbol', met: false },
    ]);
  });
});
