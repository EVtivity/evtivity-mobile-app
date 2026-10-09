// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
  missingPasswordRules,
  passwordRuleResults,
} from '@/lib/password-policy';

describe('password policy', () => {
  it('matches the CSMS rules: 12 characters, uppercase, lowercase, number', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(12);
    expect(PASSWORD_RULES).toEqual(['minLength', 'uppercase', 'lowercase', 'number']);
  });

  it('lists every rule as missing for an empty password', () => {
    expect(missingPasswordRules('')).toEqual(['minLength', 'uppercase', 'lowercase', 'number']);
  });

  it('checks each rule on its own', () => {
    expect(missingPasswordRules('abcdefghijk1')).toEqual(['uppercase']);
    expect(missingPasswordRules('ABCDEFGHIJK1')).toEqual(['lowercase']);
    expect(missingPasswordRules('Abcdefghijkl')).toEqual(['number']);
    expect(missingPasswordRules('Abcdefghij1')).toEqual(['minLength']);
  });

  it('accepts a password that meets every rule', () => {
    expect(missingPasswordRules('Abcdefghijk1')).toEqual([]);
  });

  it('reports each rule in display order with its state', () => {
    expect(passwordRuleResults('Ab1')).toEqual([
      { rule: 'minLength', met: false },
      { rule: 'uppercase', met: true },
      { rule: 'lowercase', met: true },
      { rule: 'number', met: true },
    ]);
  });
});
