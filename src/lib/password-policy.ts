// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// Driver password rules as a function of the policy an operator sets in the
// CSMS (Settings > Security). Mirrors the CSMS engine (@evtivity/lib
// password-policy), which the API enforces with 400 WEAK_PASSWORD on every
// route that sets a password. The app reads the live policy from
// GET /v1/security/public (features/password-policy.ts), checks it before
// submitting and shows it as a checklist.

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
}

export const PASSWORD_MIN_LENGTH_FLOOR = 8;
export const PASSWORD_MIN_LENGTH_CEILING = 64;

/** Fixed on the server, not a setting. */
export const PASSWORD_MAX_LENGTH = 128;

/** The rules of a server that sends no policy (older servers), and while the policy loads. */
export const DEFAULT_PASSWORD_POLICY: Readonly<PasswordPolicy> = Object.freeze({
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: false,
});

/** Every rule id in display and check order, translated as `auth.passwordRule.<id>`. */
export const PASSWORD_RULE_IDS = [
  'minLength',
  'uppercase',
  'lowercase',
  'number',
  'symbol',
  'maxLength',
] as const;

export type PasswordRule = (typeof PASSWORD_RULE_IDS)[number];

/** A rule a policy can turn on (every rule but the fixed maximum length). */
export type PolicyRule = Exclude<PasswordRule, 'maxLength'>;

const OPTIONAL_RULES: readonly { rule: PolicyRule; key: keyof PasswordPolicy }[] = [
  { rule: 'uppercase', key: 'requireUppercase' },
  { rule: 'lowercase', key: 'requireLowercase' },
  { rule: 'number', key: 'requireNumber' },
  { rule: 'symbol', key: 'requireSymbol' },
];

// A symbol is a printable ASCII character that is not a letter, a digit or a space.
const RULE_CHECKS: Record<PasswordRule, (password: string, policy: PasswordPolicy) => boolean> = {
  minLength: (password, policy) => password.length >= policy.minLength,
  uppercase: (password) => /[A-Z]/.test(password),
  lowercase: (password) => /[a-z]/.test(password),
  number: (password) => /[0-9]/.test(password),
  symbol: (password) => /[\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]/.test(password),
  maxLength: (password) => password.length <= PASSWORD_MAX_LENGTH,
};

/** The rules the policy turns on, in display order. The minimum length always applies. */
export function activePasswordRules(policy: PasswordPolicy): PolicyRule[] {
  return [
    'minLength',
    ...OPTIONAL_RULES.filter(({ key }) => policy[key] === true).map(({ rule }) => rule),
  ];
}

export function passwordRuleResults(
  password: string,
  policy: PasswordPolicy,
): readonly { rule: PolicyRule; met: boolean }[] {
  return activePasswordRules(policy).map((rule) => ({
    rule,
    met: RULE_CHECKS[rule](password, policy),
  }));
}

/**
 * The rules the password does not meet, in display order, with `maxLength` last when the
 * password is longer than `PASSWORD_MAX_LENGTH`. Empty when the password is valid.
 */
export function missingPasswordRules(password: string, policy: PasswordPolicy): PasswordRule[] {
  const missing: PasswordRule[] = activePasswordRules(policy).filter(
    (rule) => !RULE_CHECKS[rule](password, policy),
  );
  if (!RULE_CHECKS.maxLength(password, policy)) missing.push('maxLength');
  return missing;
}

/**
 * A policy from server values: a missing or mistyped field takes its default, and the minimum
 * length is truncated to an integer and clamped to the floor and ceiling.
 */
export function normalizePasswordPolicy(raw: Record<string, unknown>): PasswordPolicy {
  const bool = (key: keyof PasswordPolicy): boolean => {
    const value = raw[key];
    return typeof value === 'boolean' ? value : (DEFAULT_PASSWORD_POLICY[key] as boolean);
  };
  const rawMin = raw['minLength'];
  const minLength =
    typeof rawMin === 'number' && Number.isFinite(rawMin)
      ? Math.min(
          PASSWORD_MIN_LENGTH_CEILING,
          Math.max(PASSWORD_MIN_LENGTH_FLOOR, Math.trunc(rawMin)),
        )
      : DEFAULT_PASSWORD_POLICY.minLength;
  return {
    minLength,
    requireUppercase: bool('requireUppercase'),
    requireLowercase: bool('requireLowercase'),
    requireNumber: bool('requireNumber'),
    requireSymbol: bool('requireSymbol'),
  };
}

/** The policy of a GET /v1/security/public body, or the default when it has none. */
export function policyFromSecurityPublic(body: unknown): PasswordPolicy {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    return DEFAULT_PASSWORD_POLICY;
  }
  const raw = (body as Record<string, unknown>).passwordPolicy;
  return raw != null && typeof raw === 'object' && !Array.isArray(raw)
    ? normalizePasswordPolicy(raw as Record<string, unknown>)
    : DEFAULT_PASSWORD_POLICY;
}

/** Rules in display order, without duplicates. */
export function inRuleOrder(rules: Iterable<PasswordRule>): PasswordRule[] {
  const set = new Set(rules);
  return PASSWORD_RULE_IDS.filter((rule) => set.has(rule));
}

/** Keeps the known rule ids of a WEAK_PASSWORD `missing` list, in display order. */
export function knownPasswordRules(missing: unknown): PasswordRule[] {
  if (!Array.isArray(missing)) return [];
  const known = new Set<string>(PASSWORD_RULE_IDS);
  return inRuleOrder(
    missing.filter((rule): rule is PasswordRule => typeof rule === 'string' && known.has(rule)),
  );
}

/**
 * The checklist under a new password field: the rules of the policy, the maximum length only once
 * the password exceeds it, and every rule a WEAK_PASSWORD reply named, marked unmet.
 */
export function passwordChecklist(
  password: string,
  policy: PasswordPolicy,
  serverMissing?: readonly PasswordRule[] | null,
): { rule: PasswordRule; met: boolean }[] {
  const refused = new Set(serverMissing ?? []);
  const results = new Map<PasswordRule, boolean>(
    passwordRuleResults(password, policy).map(({ rule, met }) => [rule, met && !refused.has(rule)]),
  );
  if (missingPasswordRules(password, policy).includes('maxLength')) results.set('maxLength', false);
  for (const rule of refused) results.set(rule, false);
  return inRuleOrder(results.keys()).map((rule) => ({ rule, met: results.get(rule) === true }));
}
