// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { EMAIL_REGEX, validateEmail, validatePassword } from '@/lib/validation';

// Echoes the key and its options so the assertions see what was translated.
const t = (key: string, options?: Record<string, unknown>): string =>
  options != null ? `${key}${JSON.stringify(options)}` : key;

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
    expect(validatePassword('', t)).toBe('auth.passwordRequired');
  });

  it('names every missing rule, the length with its minimum', () => {
    expect(validatePassword('short', t)).toBe(
      'auth.passwordMissing{"rules":"auth.passwordRule.minLength{\\"min\\":12}, ' +
        'auth.passwordRule.uppercase{\\"min\\":12}, auth.passwordRule.number{\\"min\\":12}"}',
    );
  });

  it('rejects a long password without an uppercase letter or a number', () => {
    expect(validatePassword('a'.repeat(12), t)).toBe(
      'auth.passwordMissing{"rules":"auth.passwordRule.uppercase{\\"min\\":12}, ' +
        'auth.passwordRule.number{\\"min\\":12}"}',
    );
  });

  it('rejects a password without a lowercase letter', () => {
    expect(validatePassword('ABCDEFGHIJK1', t)).toBe(
      'auth.passwordMissing{"rules":"auth.passwordRule.lowercase{\\"min\\":12}"}',
    );
  });

  it('accepts a password that meets every rule', () => {
    expect(validatePassword('Abcdefghijk1', t)).toBeUndefined();
  });
});

describe('constants', () => {
  it('exposes the email pattern', () => {
    expect(EMAIL_REGEX.test('a@b.co')).toBe(true);
  });
});
