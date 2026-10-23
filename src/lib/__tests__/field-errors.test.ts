// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import en from '@/lib/i18n/en.json';
import de from '@/lib/i18n/de.json';
import es from '@/lib/i18n/es.json';
import ko from '@/lib/i18n/ko.json';
import zh from '@/lib/i18n/zh.json';
import zhTW from '@/lib/i18n/zh-TW.json';
import { isEnglishLanguage, localizeFieldError } from '@/lib/field-errors';

const t = (key: string, options?: Record<string, unknown>): string =>
  options != null ? `${key}:${JSON.stringify(options)}` : key;

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
  it.each([
    ['Required', 'fieldErrors.required'],
    ['Invalid email', 'fieldErrors.email'],
    ['Invalid url', 'fieldErrors.url'],
    ['Invalid date', 'fieldErrors.date'],
    ['Invalid datetime', 'fieldErrors.date'],
    ['Expected integer, received float', 'fieldErrors.integer'],
    ['Expected string, received number', 'fieldErrors.type'],
    ["Invalid enum value. Expected 'km' | 'mi', received 'x'", 'fieldErrors.option'],
    ['Invalid', 'fieldErrors.invalid'],
    ['Invalid input', 'fieldErrors.invalid'],
    ['Invalid uuid', 'fieldErrors.invalid'],
  ])('maps "%s" without a number', (message, key) => {
    expect(localizeFieldError(message, t, 'de')).toBe(key);
  });

  it.each([
    ['String must contain at least 8 character(s)', 'tooShort', '8'],
    ['String must contain exactly 2 character(s)', 'exactLength', '2'],
    ['String must contain at most 100 character(s)', 'tooLong', '100'],
    ['Number must be greater than or equal to 0', 'min', '0'],
    ['Number must be greater than -1.5', 'above', '-1.5'],
    ['Number must be less than or equal to 50', 'max', '50'],
    ['Number must be less than 10', 'below', '10'],
    ['Array must contain at least 1 element(s)', 'tooFew', '1'],
    ['Array must contain at most 5 element(s)', 'tooMany', '5'],
  ])('maps "%s" with its number', (message, key, n) => {
    expect(localizeFieldError(` ${message} `, t, 'ko')).toBe(
      `fieldErrors.${key}:${JSON.stringify({ n })}`,
    );
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
