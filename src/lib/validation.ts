// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Shared form validation for the auth screens. Each validator returns a
// translated error message, or undefined when the value is valid.

import {
  PASSWORD_MAX_LENGTH,
  inRuleOrder,
  missingPasswordRules,
  type PasswordPolicy,
  type PasswordRule,
} from './password-policy';

export const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function validateEmail(value: string, t: (key: string) => string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return t('auth.emailRequired');
  if (!EMAIL_REGEX.test(trimmed)) return t('auth.emailInvalid');
  return undefined;
}

export function passwordRuleLabel(
  rule: PasswordRule,
  policy: PasswordPolicy,
  t: Translate,
): string {
  return t(`auth.passwordRule.${rule}`, { min: policy.minLength, max: PASSWORD_MAX_LENGTH });
}

// Names every rule the password misses ("Password needs at least 12
// characters, a number."), the same message the portal shows. `serverMissing`
// adds the rules a WEAK_PASSWORD reply named; an empty reply list falls back to
// the generic weak password text.
export function validatePassword(
  value: string,
  t: Translate,
  policy: PasswordPolicy,
  serverMissing?: readonly PasswordRule[] | null,
): string | undefined {
  if (value.length === 0) return t('auth.passwordRequired');
  const missing = inRuleOrder([...missingPasswordRules(value, policy), ...(serverMissing ?? [])]);
  if (missing.length === 0) return serverMissing != null ? t('auth.passwordWeak') : undefined;
  const rules = missing.map((rule) => passwordRuleLabel(rule, policy, t)).join(', ');
  return t('auth.passwordMissing', { rules });
}
