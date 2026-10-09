// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Shared form validation for the auth screens. Each validator returns a
// translated error message, or undefined when the value is valid.

import { PASSWORD_MIN_LENGTH, missingPasswordRules } from './password-policy';

export const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function validateEmail(value: string, t: (key: string) => string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return t('auth.emailRequired');
  if (!EMAIL_REGEX.test(trimmed)) return t('auth.emailInvalid');
  return undefined;
}

// Names every rule the password misses ("Password needs at least 12
// characters, a number."), the same message the portal shows.
export function validatePassword(value: string, t: Translate): string | undefined {
  if (value.length === 0) return t('auth.passwordRequired');
  const missing = missingPasswordRules(value);
  if (missing.length === 0) return undefined;
  const rules = missing
    .map((rule) => t(`auth.passwordRule.${rule}`, { min: PASSWORD_MIN_LENGTH }))
    .join(', ');
  return t('auth.passwordMissing', { rules });
}
