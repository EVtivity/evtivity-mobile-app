// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Shared form validation for the auth screens. Each validator returns a
// translated error message, or undefined when the value is valid.

export const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
export const MIN_PASSWORD_LENGTH = 12;

export function validateEmail(value: string, t: (key: string) => string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return t('auth.emailRequired');
  if (!EMAIL_REGEX.test(trimmed)) return t('auth.emailInvalid');
  return undefined;
}

export function validatePassword(
  value: string,
  t: (key: string, options?: { min: number }) => string,
): string | undefined {
  if (value.length === 0) return t('auth.passwordRequired');
  if (value.length < MIN_PASSWORD_LENGTH) {
    return t('auth.passwordTooShort', { min: MIN_PASSWORD_LENGTH });
  }
  return undefined;
}
