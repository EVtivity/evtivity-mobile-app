// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { EMAIL_REGEX, validateEmail, validatePassword } from '@/lib/validation';
import { DEFAULT_PASSWORD_POLICY, type PasswordPolicy } from '@/lib/password-policy';

// Echoes the key and its options so the assertions see what was translated.
const t = (key: string, options?: Record<string, unknown>): string =>
  options != null ? `${key}${JSON.stringify(options)}` : key;

const p = DEFAULT_PASSWORD_POLICY;
const opts = '{\\"min\\":12,\\"max\\":128}';

describe('validateEmail', () => {
  it('requires a value', () => {
    expect(validateEmail('   ', t)).toBe('auth.emailRequired');
  });
  it('rejects a malformed address', () => {
    expect(validateEmail('not-an-email', t)).toBe('auth.emailInvalid');
  });
  it('accepts a valid, trimmable address', () => {
    expect(validateEmail('  driver@example.com  ', t)).toBeUndefined();
  });
});

describe('validatePassword', () => {
  it('requires a value', () => {
    expect(validatePassword('', t, p)).toBe('auth.passwordRequired');
  });

  it('names every missing rule, the length with its minimum', () => {
    expect(validatePassword('short', t, p)).toBe(
      `auth.passwordMissing{"rules":"auth.passwordRule.minLength${opts}, ` +
        `auth.passwordRule.uppercase${opts}, auth.passwordRule.number${opts}"}`,
    );
  });

  it('rejects a password without a lowercase letter', () => {
    expect(validatePassword('ABCDEFGHIJK1', t, p)).toBe(
      `auth.passwordMissing{"rules":"auth.passwordRule.lowercase${opts}"}`,
    );
  });

  it('accepts a password that meets every rule', () => {
    expect(validatePassword('Abcdefghijk1', t, p)).toBeUndefined();
  });

  it('follows the live policy: its minimum length and the symbol rule', () => {
    const policy: PasswordPolicy = {
      minLength: 16,
      requireUppercase: false,
      requireLowercase: true,
      requireNumber: false,
      requireSymbol: true,
    };
    expect(validatePassword('abcdefghijkl', t, policy)).toBe(
      'auth.passwordMissing{"rules":"auth.passwordRule.minLength{\\"min\\":16,\\"max\\":128}, ' +
        'auth.passwordRule.symbol{\\"min\\":16,\\"max\\":128}"}',
    );
    expect(validatePassword('abcdefghijklmno!', t, policy)).toBeUndefined();
  });

  it('names the maximum length once a password exceeds it', () => {
    expect(validatePassword(`Abc1${'a'.repeat(125)}`, t, p)).toBe(
      `auth.passwordMissing{"rules":"auth.passwordRule.maxLength${opts}"}`,
    );
  });

  it('adds the rules a WEAK_PASSWORD reply named', () => {
    expect(validatePassword('Abcdefghijk1', t, p, ['symbol'])).toBe(
      `auth.passwordMissing{"rules":"auth.passwordRule.symbol${opts}"}`,
    );
    expect(validatePassword('Abcdefghijk1', t, p, [])).toBe('auth.passwordWeak');
  });
});

describe('constants', () => {
  it('exposes the email pattern', () => {
    expect(EMAIL_REGEX.test('a@b.co')).toBe(true);
  });
});
