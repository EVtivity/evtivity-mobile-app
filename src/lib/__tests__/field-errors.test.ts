// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import en from '@/lib/i18n/en.json';
import de from '@/lib/i18n/de.json';
import es from '@/lib/i18n/es.json';
import ko from '@/lib/i18n/ko.json';
import zh from '@/lib/i18n/zh.json';
import zhTW from '@/lib/i18n/zh-TW.json';
import { isEnglishLanguage, localizeFieldError, localizeFieldErrors } from '@/lib/field-errors';

const t = (key: string, options?: Record<string, unknown>): string =>
  options != null ? `${key}:${JSON.stringify(options)}` : key;

// A translator over one locale's field texts, `{{n}}` filled in.
const localeT =
  (locale: { fieldErrors: Record<string, string> }) =>
  (key: string, options?: Record<string, unknown>): string => {
    const text = locale.fieldErrors[key.replace(/^fieldErrors\./, '')] ?? key;
    return text.replace('{{n}}', String(options?.n));
  };

describe('isEnglishLanguage', () => {
  it('treats unset, empty and en-* as English', () => {
    expect(isEnglishLanguage(undefined)).toBe(true);
    expect(isEnglishLanguage('')).toBe(true);
    expect(isEnglishLanguage('en')).toBe(true);
    expect(isEnglishLanguage('en-GB')).toBe(true);
    expect(isEnglishLanguage('de')).toBe(false);
    expect(isEnglishLanguage('zh-TW')).toBe(false);
  });
});

describe('localizeFieldError', () => {
  // Ajv 8 messages as the API sends them in `details` (Fastify's Ajv on the
  // JSON Schemas the API makes from its Zod schemas).
  it.each([
    ["must have required property 'city'", 'fieldErrors.required'],
    ['must match format "email"', 'fieldErrors.email'],
    ['must match format "uri"', 'fieldErrors.url'],
    ['must match format "date-time"', 'fieldErrors.date'],
    ['must match format "date"', 'fieldErrors.date'],
    ['must match format "uuid"', 'fieldErrors.invalid'],
    ['must be equal to one of the allowed values', 'fieldErrors.option'],
    ['must be integer', 'fieldErrors.integer'],
    ['must be string', 'fieldErrors.type'],
    ['must be number', 'fieldErrors.type'],
    ['must be boolean', 'fieldErrors.type'],
    ['must be string,null', 'fieldErrors.type'],
    ['must match pattern "^\\+[1-9]\\d{1,14}$"', 'fieldErrors.invalid'],
    ['must NOT have additional properties', 'fieldErrors.invalid'],
  ])('maps "%s" without a number', (message, key) => {
    expect(localizeFieldError(message, t, 'de')).toBe(key);
  });

  it.each([
    ['must NOT have fewer than 8 characters', 'tooShort', '8'],
    ['must NOT have more than 100 characters', 'tooLong', '100'],
    ['must be >= 0', 'min', '0'],
    ['must be > -1.5', 'above', '-1.5'],
    ['must be <= 50', 'max', '50'],
    ['must be < 1e-7', 'below', '1e-7'],
    ['must NOT have fewer than 1 items', 'tooFew', '1'],
    ['must NOT have more than 5 items', 'tooMany', '5'],
  ])('maps "%s" with its limit', (message, key, n) => {
    expect(localizeFieldError(` ${message} `, t, 'ko')).toBe(
      `fieldErrors.${key}:${JSON.stringify({ n })}`,
    );
  });

  it('maps an Ajv message in an English UI too', () => {
    expect(localizeFieldError('must NOT have fewer than 8 characters', localeT(en), 'en')).toBe(
      'Enter at least 8 characters.',
    );
    expect(localizeFieldError('must be <= 50', localeT(de), 'de')).toBe(
      'Gib einen Wert von höchstens 50 ein.',
    );
  });

  it('treats a Zod message, which never reaches `details`, as unknown text', () => {
    expect(localizeFieldError('Required', t, 'de')).toBe('fieldErrors.invalid');
    expect(localizeFieldError('Required', t, 'en')).toBe('Required');
  });

  it('shows an unknown message as sent in an English UI only', () => {
    expect(localizeFieldError('Phone number is taken', t, 'en')).toBe('Phone number is taken');
    expect(localizeFieldError('Phone number is taken', t, 'es')).toBe('fieldErrors.invalid');
    expect(localizeFieldError('   ', t, 'en')).toBe('fieldErrors.invalid');
  });

  it('has every field message in all six languages', () => {
    const keys = Object.keys(en.fieldErrors).sort();
    for (const locale of [de, es, ko, zh, zhTW]) {
      expect(Object.keys(locale.fieldErrors).sort()).toEqual(keys);
    }
    for (const locale of [en, de, es, ko, zh, zhTW]) {
      for (const code of [
        'UNAUTHORIZED',
        'NOT_FOUND',
        'PAYLOAD_TOO_LARGE',
        'UNSUPPORTED_MEDIA_TYPE',
      ]) {
        expect(typeof (locale.errors as Record<string, string>)[code]).toBe('string');
      }
    }
  });
});

describe('localizeFieldErrors', () => {
  it('moves a missing nested property from its parent to its own key', () => {
    expect(
      localizeFieldErrors(
        { address: "must have required property 'city'" },
        "body/address must have required property 'city'",
        t,
        'de',
      ),
    ).toEqual({ 'address/city': 'fieldErrors.required' });
  });

  it('names a missing top-level property from the reply error', () => {
    // An empty instance path: the API puts nothing in `details`.
    expect(localizeFieldErrors({}, " body must have required property 'email' ", t, 'es')).toEqual({
      email: 'fieldErrors.required',
    });
  });

  it('keeps other fields under their keys and ignores other errors', () => {
    expect(
      localizeFieldErrors(
        { password: 'must NOT have fewer than 8 characters' },
        'body/password must NOT have fewer than 8 characters',
        t,
        'zh',
      ),
    ).toEqual({ password: `fieldErrors.tooShort:${JSON.stringify({ n: '8' })}` });
    expect(
      localizeFieldErrors({}, "querystring must have required property 'limit'", t, 'zh'),
    ).toEqual({});
    expect(localizeFieldErrors({}, undefined, t, 'zh')).toEqual({});
  });

  it('keeps a field the details already name', () => {
    expect(
      localizeFieldErrors(
        { email: 'must match format "email"' },
        "body must have required property 'email'",
        t,
        'ko',
      ),
    ).toEqual({ email: 'fieldErrors.email' });
  });
});
