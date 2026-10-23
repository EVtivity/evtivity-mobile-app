// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The API answers a schema failure with `details: { field: message }`, the
// message being the schema validator's English text (Zod's default messages,
// such as "Required" or "String must contain at least 8 character(s)"). This
// maps those messages to the app's own text in the app language.

type Translate = (key: string, options?: Record<string, unknown>) => string;

interface FieldRule {
  re: RegExp;
  key: string;
  // The named regex group `n` is carried into the translation as `{{n}}`.
  count?: boolean;
}

// Order matters: the first match wins.
const RULES: readonly FieldRule[] = [
  { re: /^Required$/, key: 'required' },
  { re: /^Invalid email$/, key: 'email' },
  { re: /^Invalid url$/, key: 'url' },
  { re: /^Invalid (date|datetime)$/, key: 'date' },
  { re: /^Expected integer, received /, key: 'integer' },
  { re: /^Expected .+, received /, key: 'type' },
  { re: /^Invalid enum value\./, key: 'option' },
  { re: /^String must contain at least (?<n>\d+) character\(s\)$/, key: 'tooShort', count: true },
  { re: /^String must contain exactly (?<n>\d+) character\(s\)$/, key: 'exactLength', count: true },
  { re: /^String must contain at most (?<n>\d+) character\(s\)$/, key: 'tooLong', count: true },
  { re: /^Number must be greater than or equal to (?<n>-?[\d.]+)$/, key: 'min', count: true },
  { re: /^Number must be greater than (?<n>-?[\d.]+)$/, key: 'above', count: true },
  { re: /^Number must be less than or equal to (?<n>-?[\d.]+)$/, key: 'max', count: true },
  { re: /^Number must be less than (?<n>-?[\d.]+)$/, key: 'below', count: true },
  { re: /^Array must contain at least (?<n>\d+) element\(s\)$/, key: 'tooFew', count: true },
  { re: /^Array must contain at most (?<n>\d+) element\(s\)$/, key: 'tooMany', count: true },
  { re: /^Invalid( input| uuid| cuid| regex)?$/, key: 'invalid' },
];

// The server writes its messages in English: only an English UI shows them.
export function isEnglishLanguage(language: string | undefined): boolean {
  return language == null || language === '' || language.split('-')[0] === 'en';
}

/**
 * One server field message in the app language: a known validator message
 * maps to the app's text; any other message shows as sent in an English UI
 * only, else the generic "not valid" text.
 */
export function localizeFieldError(
  message: string,
  t: Translate,
  language: string | undefined,
): string {
  const m = message.trim();
  for (const rule of RULES) {
    const match = rule.re.exec(m);
    if (match == null) continue;
    const key = `fieldErrors.${rule.key}`;
    return rule.count === true ? t(key, { n: match.groups?.n }) : t(key);
  }
  if (m.length > 0 && isEnglishLanguage(language)) return m;
  return t('fieldErrors.invalid');
}
