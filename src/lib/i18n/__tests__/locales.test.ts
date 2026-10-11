// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// TC-AI-DR-UI-07: the driver AI support keys exist and are filled in every
// language, and the Chinese and Korean texts use the driver terms.

import en from '../en.json';
import de from '../de.json';
import es from '../es.json';
import ko from '../ko.json';
import zh from '../zh.json';
import zhTW from '../zh-TW.json';

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

// Every key the driver AI support screens read.
const AI_KEYS = [
  'support.status.ai_assist',
  'support.ai.choiceTitle',
  'support.ai.choiceAi',
  'support.ai.choiceTeam',
  'support.ai.changeChoice',
  'support.ai.notice.v1.title',
  'support.ai.notice.v1.automated',
  'support.ai.notice.v1.provider',
  'support.ai.notice.v1.person',
  'support.ai.notice.v1.choice',
  'support.ai.notice.v1.privacy',
  'support.ai.notice.v1.readsTitle',
  'support.ai.notice.v1.reads.case',
  'support.ai.notice.v1.reads.sessions',
  'support.ai.notice.v1.reads.tokens',
  'support.ai.notice.v1.reads.payments',
  'support.ai.notice.v1.reads.stations',
  'support.ai.notice.v1.reads.reservations',
  'support.ai.analyzing',
  'support.ai.answerTitle',
  'support.ai.feedbackQuestion',
  'support.ai.feedbackYes',
  'support.ai.feedbackNo',
  'support.ai.feedbackNoHint',
  'support.ai.feedbackFailed',
  'support.ai.resolved',
  'support.ai.escalated',
  'support.ai.sentToTeam',
  'support.ai.driverAction.try_other_connector',
  'support.ai.driverAction.check_payment_method',
  'support.ai.driverAction.retry_start',
  'support.ai.driverAction.check_vehicle_settings',
  'support.ai.driverAction.contact_operator',
  'support.ai.driverAction.wait_and_retry',
  'support.ai.driverAction.check_token_active',
  'ai.dataNotice.title',
  'ai.dataNotice.body',
  'errors.DRIVER_AI_NOTICE_OUTDATED',
  'errors.SUPPORT_CASE_AI_NOT_AWAITING_FEEDBACK',
];

describe('TC-AI-DR-UI-07 driver AI support locales', () => {
  it.each(Object.keys(LOCALES))('has every driver AI key filled in %s', (lang) => {
    const missing = AI_KEYS.filter((key) => {
      const text = value(LOCALES[lang], key);
      return typeof text !== 'string' || text.trim() === '';
    });
    expect(missing).toEqual([]);
  });

  it('has no driver AI key in another language that English lacks', () => {
    const enKeys = new Set(flatten(value(en, 'support.ai')).map(([k]) => k));
    for (const [lang, locale] of Object.entries(LOCALES)) {
      const extra = flatten(value(locale, 'support.ai'))
        .map(([k]) => k)
        .filter((k) => !enKeys.has(k));
      expect([lang, extra]).toEqual([lang, []]);
    }
  });

  it('calls a driver 驾驶员 in Simplified Chinese, never 司机', () => {
    const texts = flatten(value(zh, 'support.ai'));
    expect(texts.filter(([, text]) => text.includes('司机'))).toEqual([]);
    expect(value(zh, 'ai.dataNotice.body')).toContain('驾驶员');
    expect(flatten(zh).filter(([, text]) => text.includes('司机'))).toEqual([]);
  });

  it('calls a driver 駕駛員 in Traditional Chinese, never 司機', () => {
    expect(flatten(zhTW).filter(([, text]) => text.includes('司機'))).toEqual([]);
    expect(value(zhTW, 'ai.dataNotice.body')).toContain('駕駛員');
  });

  it('calls a driver 운전자 in Korean, never 드라이버', () => {
    expect(flatten(ko).filter(([, text]) => text.includes('드라이버'))).toEqual([]);
    expect(value(ko, 'ai.dataNotice.body')).toContain('운전자');
  });
});
