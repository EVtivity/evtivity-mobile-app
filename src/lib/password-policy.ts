// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Driver password rules. Mirrors the CSMS policy (@evtivity/lib password-policy),
// which the API enforces with 400 WEAK_PASSWORD on every route that sets a
// password. The app checks them before submitting and shows them as a checklist.

export const PASSWORD_MIN_LENGTH = 12;

/** Rule ids in display and check order, translated as `auth.passwordRule.<id>`. */
export const PASSWORD_RULES = ['minLength', 'uppercase', 'lowercase', 'number'] as const;

export type PasswordRule = (typeof PASSWORD_RULES)[number];

const RULE_CHECKS: Record<PasswordRule, (password: string) => boolean> = {
  minLength: (password) => password.length >= PASSWORD_MIN_LENGTH,
  uppercase: (password) => /[A-Z]/.test(password),
  lowercase: (password) => /[a-z]/.test(password),
  number: (password) => /[0-9]/.test(password),
};

export function passwordRuleResults(
  password: string,
): readonly { rule: PasswordRule; met: boolean }[] {
  return PASSWORD_RULES.map((rule) => ({ rule, met: RULE_CHECKS[rule](password) }));
}

/** The rules the password does not meet, in display order. Empty when the password is valid. */
export function missingPasswordRules(password: string): PasswordRule[] {
  return PASSWORD_RULES.filter((rule) => !RULE_CHECKS[rule](password));
}
