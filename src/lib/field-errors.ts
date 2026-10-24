// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The API validates requests with Fastify's Ajv against JSON Schemas made from
// its Zod schemas, and answers a failure with VALIDATION_ERROR and
// `details: { field: message }`: the field is Ajv's instance path without the
// leading slash (`email`, `address/line1`), the message Ajv's English text
// ("must NOT have fewer than 8 characters", "must match format \"email\"").
// Ajv stops at the first error, so a reply names one field.
//
// A missing property is reported on its parent: the message names it
// ("must have required property 'city'" under `address`). A missing top-level
// property has an empty path, so it is not in `details` at all and only the
// reply's `error` names it ("body must have required property 'email'").
//
// This maps those messages to the app's own text in the app language, under
// the field the app shows.

type Translate = (key: string, options?: Record<string, unknown>) => string;

interface FieldRule {
  re: RegExp;
  key: string;
  // The named regex group `n` is carried into the translation as `{{n}}`.
  count?: boolean;
}

const NUMBER = '-?\\d+(?:\\.\\d+)?(?:e[-+]?\\d+)?';
const TYPES = 'string|number|integer|boolean|object|array|null';

// Order matters: the first match wins.
const RULES: readonly FieldRule[] = [
  { re: /^must have required property '.+'$/, key: 'required' },
  { re: /^must NOT have fewer than (?<n>\d+) characters$/, key: 'tooShort', count: true },
  { re: /^must NOT have more than (?<n>\d+) characters$/, key: 'tooLong', count: true },
  { re: /^must NOT have fewer than (?<n>\d+) items$/, key: 'tooFew', count: true },
  { re: /^must NOT have more than (?<n>\d+) items$/, key: 'tooMany', count: true },
  { re: new RegExp(`^must be >= (?<n>${NUMBER})$`), key: 'min', count: true },
  { re: new RegExp(`^must be > (?<n>${NUMBER})$`), key: 'above', count: true },
  { re: new RegExp(`^must be <= (?<n>${NUMBER})$`), key: 'max', count: true },
  { re: new RegExp(`^must be < (?<n>${NUMBER})$`), key: 'below', count: true },
  { re: /^must match format "email"$/, key: 'email' },
  { re: /^must match format "(uri|url)"$/, key: 'url' },
  { re: /^must match format "(date-time|date)"$/, key: 'date' },
  { re: /^must be equal to one of the allowed values$/, key: 'option' },
  { re: /^must be integer(,null)?$/, key: 'integer' },
  { re: new RegExp(`^must be (${TYPES})(,(${TYPES}))*$`), key: 'type' },
  { re: /^must match (format|pattern) ".*"$/, key: 'invalid' },
  { re: /^must NOT have additional properties$/, key: 'invalid' },
];

// Ajv's text for a missing property, which names the property.
const REQUIRED_RE = /^must have required property '(?<name>.+)'$/;
// The reply's `error` for a missing top-level body property: Fastify writes
// `body` plus the (empty) instance path, then Ajv's message.
const ROOT_REQUIRED_RE = /^body must have required property '(?<name>.+)'$/;

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

/**
 * The field errors of a VALIDATION_ERROR reply in the app language, keyed by
 * the field the app shows: a missing property moves from its parent's key to
 * its own (`address` + 'city' is `address/city`), and a missing top-level
 * property, named only in the reply's `error`, gets its own key.
 */
export function localizeFieldErrors(
  details: Readonly<Record<string, string>>,
  serverMessage: string | undefined,
  t: Translate,
  language: string | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [field, message] of Object.entries(details)) {
    const missing = REQUIRED_RE.exec(message.trim())?.groups?.name;
    out[missing != null ? `${field}/${missing}` : field] = localizeFieldError(message, t, language);
  }
  const rootMissing = ROOT_REQUIRED_RE.exec(serverMessage?.trim() ?? '')?.groups?.name;
  if (rootMissing != null && !(rootMissing in out)) {
    out[rootMissing] = t('fieldErrors.required');
  }
  return out;
}
