// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import {
  EMAIL_REGEX,
  MIN_PASSWORD_LENGTH,
  validateEmail,
  validatePassword,
} from '@/lib/validation';

const t = (key: string, options?: { min: number }): string =>
  options != null ? `${key}:${String(options.min)}` : key;

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
  it('rejects a too-short password with the minimum length', () => {
    expect(validatePassword('short', t)).toBe(`auth.passwordTooShort:${String(MIN_PASSWORD_LENGTH)}`);
  });
  it('accepts a long-enough password', () => {
    expect(validatePassword('a'.repeat(MIN_PASSWORD_LENGTH), t)).toBeUndefined();
  });
});

describe('constants', () => {
  it('exposes the email pattern and minimum length', () => {
    expect(EMAIL_REGEX.test('a@b.co')).toBe(true);
    expect(MIN_PASSWORD_LENGTH).toBe(12);
  });
});
