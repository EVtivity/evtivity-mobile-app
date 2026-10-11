// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import en from '../i18n/en.json';
import de from '../i18n/de.json';
import es from '../i18n/es.json';
import ko from '../i18n/ko.json';
import zh from '../i18n/zh.json';
import zhTW from '../i18n/zh-TW.json';

const LOCALES: Record<string, unknown> = { en, de, es, ko, zh, 'zh-TW': zhTW };

function flatten(node: unknown, prefix = ''): [string, string][] {
  if (typeof node === 'string') return [[prefix, node]];
  if (node == null || typeof node !== 'object') return [];
  return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) =>
    flatten(v, prefix === '' ? k : `${prefix}.${k}`),
  );
}

function value(locale: unknown, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>((n, part) => (n as Record<string, unknown> | undefined)?.[part], locale);
}

// Korean: an EV driver is 운전자, never 드라이버 (same rule as the CSMS and
// portal locales). List a key here only where it means a software driver.
const ALLOWED_KO_DRIVER_KEYS: ReadonlySet<string> = new Set<string>();

describe('locale terms', () => {
  it('calls a driver 운전자 in Korean, never 드라이버', () => {
    const found = flatten(ko)
      .filter(([key, text]) => text.includes('드라이버') && !ALLOWED_KO_DRIVER_KEYS.has(key))
      .map(([key]) => key);
    expect(found).toEqual([]);
  });

  it('has the AI data notice in every language (the same text as the CSMS and portal)', () => {
    for (const [lang, locale] of Object.entries(LOCALES)) {
      for (const key of ['ai.dataNotice.title', 'ai.dataNotice.body']) {
        const text = value(locale, key);
        expect([lang, key, typeof text === 'string' && text.trim() !== '']).toEqual([
          lang,
          key,
          true,
        ]);
      }
    }
    expect(value(zh, 'ai.dataNotice.body')).toContain('驾驶员');
    expect(value(zhTW, 'ai.dataNotice.body')).toContain('駕駛員');
    expect(value(ko, 'ai.dataNotice.body')).toContain('운전자');
  });
});
