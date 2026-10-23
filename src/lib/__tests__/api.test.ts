// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

jest.mock('@/lib/config', () => ({ API_BASE_URL: 'http://api.test' }));
jest.mock('@/lib/device', () => ({
  deviceHeaders: jest.fn(async () => ({
    Accept: 'application/json',
    'X-Client': 'mobile',
    'X-Device-Id': 'dev-1',
  })),
}));
jest.mock('@/lib/attestation', () => ({ getAttestationHeaders: jest.fn(async () => ({})) }));
jest.mock('@/lib/session', () => ({
  getAccessToken: jest.fn(() => null),
  isAccessTokenStale: jest.fn(() => false),
  refreshSession: jest.fn(async () => true),
  hasSession: jest.fn(() => false),
}));

import {
  api,
  ApiError,
  apiErrorMessage,
  authorizedHeaders,
  getApiErrorFieldDetails,
  portalPageUrl,
  portalReasonMessage,
  webUrl,
} from '@/lib/api';
import * as session from '@/lib/session';
import * as attestation from '@/lib/attestation';

const sess = session as jest.Mocked<typeof session>;
const attest = attestation as jest.Mocked<typeof attestation>;

const resp = (status: number, body: string): Response =>
  ({
    status,
    ok: status >= 200 && status < 300,
    text: async () => body,
  }) as unknown as Response;

const t = (k: string): string => k;

beforeEach(() => {
  jest.clearAllMocks();
  sess.getAccessToken.mockReturnValue(null);
  sess.isAccessTokenStale.mockReturnValue(false);
  sess.hasSession.mockReturnValue(false);
  sess.refreshSession.mockResolvedValue(true);
  attest.getAttestationHeaders.mockResolvedValue({});
  (global as unknown as { fetch: jest.Mock }).fetch = jest.fn();
});

describe('authorizedHeaders', () => {
  it('refreshes a stale access token first, then sends it', async () => {
    sess.hasSession.mockReturnValue(true);
    sess.isAccessTokenStale.mockReturnValue(true);
    sess.getAccessToken.mockReturnValue('fresh');
    const headers = await authorizedHeaders();
    expect(sess.refreshSession).toHaveBeenCalledTimes(1);
    expect(headers).toMatchObject({ 'X-Client': 'mobile', Authorization: 'Bearer fresh' });
  });

  it('skips the refresh for a current token and sends no token without one', async () => {
    sess.hasSession.mockReturnValue(true);
    const headers = await authorizedHeaders();
    expect(sess.refreshSession).not.toHaveBeenCalled();
    expect(headers.Authorization).toBeUndefined();
  });
});

describe('portal links', () => {
  it('reads an http(s) portalUrl from a refusal and nothing else', () => {
    expect(new ApiError(400, { portalUrl: 'https://portal.test' }).portalUrl).toBe(
      'https://portal.test/',
    );
    expect(new ApiError(400, { portalUrl: 'javascript:alert(1)' }).portalUrl).toBeUndefined();
    expect(new ApiError(400, { portalUrl: 'not a url' }).portalUrl).toBeUndefined();
    expect(new ApiError(400, { portalUrl: 1 }).portalUrl).toBeUndefined();
    expect(new ApiError(400, null).portalUrl).toBeUndefined();
  });

  it('builds a portal page URL from the base and a route', () => {
    expect(portalPageUrl('https://portal.test', '/account/security')).toBe(
      'https://portal.test/account/security',
    );
    expect(portalPageUrl(' https://portal.test/ ', 'account/personal')).toBe(
      'https://portal.test/account/personal',
    );
    expect(portalPageUrl('ftp://portal.test', '/x')).toBeNull();
    expect(portalPageUrl('', '/x')).toBeNull();
    expect(portalPageUrl(undefined, '/x')).toBeNull();
    expect(portalPageUrl(null, '/x')).toBeNull();
  });

  it('accepts only absolute http(s) URLs', () => {
    expect(webUrl('http://a.test/x')).toBe('http://a.test/x');
    expect(webUrl('mailto:a@b.test')).toBeNull();
  });
});

describe('ApiError', () => {
  it('extracts a string code from the body', () => {
    expect(new ApiError(400, { code: 'X' }).code).toBe('X');
  });
  it('returns undefined code for a non-object or codeless body', () => {
    expect(new ApiError(400, null).code).toBeUndefined();
    expect(new ApiError(400, { code: 1 }).code).toBeUndefined();
  });
  it('extracts a server message', () => {
    expect(new ApiError(400, { error: 'bad' }).serverMessage).toBe('bad');
    expect(new ApiError(400, { error: 1 }).serverMessage).toBeUndefined();
    expect(new ApiError(400, 'str').serverMessage).toBeUndefined();
  });
  it('flags server-down statuses', () => {
    expect(new ApiError(503, null).isServerDown).toBe(true);
    expect(new ApiError(404, null).isServerDown).toBe(false);
  });
  it('treats a gateway status without an error code as server-down', () => {
    expect(new ApiError(502, '<html>Bad Gateway</html>').isServerDown).toBe(true);
    expect(new ApiError(504, null).isServerDown).toBe(true);
  });
  it('treats a coded 502/504 as a station failure, not server-down', () => {
    expect(new ApiError(502, { error: 'x', code: 'STATUS_CHECK_REJECTED' }).isServerDown).toBe(
      false,
    );
    expect(new ApiError(504, { error: 'x', code: 'STATUS_CHECK_TIMEOUT' }).isServerDown).toBe(
      false,
    );
  });
});

describe('apiErrorMessage', () => {
  const translated: Record<string, string> = {
    'errors.STATUS_CHECK_TIMEOUT': 'Zeitüberschreitung bei der Statusabfrage.',
  };
  const tr = (key: string): string => translated[key] ?? key;
  it('prefers the translated message for a known error code', () => {
    const err = new ApiError(504, { error: 'English text', code: 'STATUS_CHECK_TIMEOUT' });
    expect(apiErrorMessage(err, tr)).toBe('Zeitüberschreitung bei der Statusabfrage.');
  });
  const LANGS = ['en', 'es', 'zh', 'de', 'ko', 'zh-TW'];
  const CODES: [string, number][] = [
    ['FLEET_CREDIT_LIMIT_REACHED', 402],
    ['PAYMENT_METHOD_REQUIRED', 400],
    ['AUTOCHARGE_CLAIM_REQUIRED', 409],
    ['VEHICLE_ID_IN_USE', 409],
  ];
  it.each(LANGS.flatMap((lang) => CODES.map(([code, status]) => [code, lang, status] as const)))(
    'translates %s in %s',
    (code, lang, status) => {
      const locale = require(`../i18n/${lang}.json`) as { errors: Record<string, string> };
      const expected = locale.errors[code];
      expect(typeof expected).toBe('string');
      const tLocale = (key: string): string =>
        key.startsWith('errors.') ? (locale.errors[key.slice(7)] ?? key) : key;
      const err = new ApiError(status, { error: 'English text', code });
      expect(apiErrorMessage(err, tLocale)).toBe(expected);
    },
  );
  // A catalogue lookup like i18next's t for one locale file.
  const localeT =
    (lang: string) =>
    (key: string): string => {
      const catalogue = require(`../i18n/${lang}.json`) as Record<string, unknown>;
      const value = key
        .split('.')
        .reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], catalogue);
      return typeof value === 'string' ? value : key;
    };

  it.each(['en', 'de', 'es', 'ko', 'zh', 'zh-TW'])(
    'never shows the English server message of a portal refusal (%s)',
    (lang) => {
      const tl = localeT(lang);
      const disable = new ApiError(400, {
        error: 'Turn off two-factor authentication in the driver portal at https://portal.test',
        code: 'VALIDATION_ERROR',
        portalUrl: 'https://portal.test',
      });
      expect(apiErrorMessage(disable, tl, lang)).toBe(tl('account.portalGeneric'));
      const enroll = new ApiError(403, {
        error: 'Set up two-factor authentication in the driver portal at https://portal.test',
        code: 'MFA_ENROLLMENT_REQUIRED',
        portalUrl: 'https://portal.test',
      });
      expect(apiErrorMessage(enroll, tl, lang)).toBe(tl('account.portalMfaEnrollment'));
      expect(portalReasonMessage(enroll, tl)).toBe(tl('account.portalMfaEnrollment'));
      expect(tl('account.portalGeneric')).not.toBe('account.portalGeneric');
    },
  );

  it('shows a plain VALIDATION_ERROR sentence in an English UI only', () => {
    const v = (body: Record<string, unknown>): ApiError =>
      new ApiError(400, { code: 'VALIDATION_ERROR', ...body });
    const sentence = v({ error: 'Invalid IANA timezone' });
    const withFields = v({ error: 'Invalid phone number', details: { phone: 'Invalid phone' } });
    expect(apiErrorMessage(sentence, localeT('en'), 'en-US')).toBe('Invalid IANA timezone');
    // German: the localized text, never the English sentence.
    expect(apiErrorMessage(sentence, localeT('de'), 'de')).toBe('Validierungsfehler');
    expect(apiErrorMessage(withFields, localeT('de'), 'de')).toBe(
      'Prüfen Sie die markierten Felder.',
    );
    expect(apiErrorMessage(withFields, localeT('en'), 'en')).toBe('Invalid phone number');
    // No sentence: the field text when fields are named, else "Validation error".
    expect(apiErrorMessage(v({ details: { phone: 'x' } }), localeT('en'), 'en')).toBe(
      'Check the highlighted fields.',
    );
    expect(apiErrorMessage(v({}), localeT('ko'), 'ko')).toBe(
      localeT('ko')('errors.VALIDATION_ERROR'),
    );
  });

  it('shows a plain VALIDATION_ERROR message and the generic text otherwise', () => {
    const tr = (k: string): string => (k === 'errors.VALIDATION_ERROR' ? 'Validation error' : k);
    const v = (error?: unknown): ApiError =>
      new ApiError(400, { code: 'VALIDATION_ERROR', ...(error !== undefined ? { error } : {}) });
    // The UI language defaults to i18next's (unset here: treated as English).
    expect(apiErrorMessage(v(' Invalid IANA timezone '), tr)).toBe('Invalid IANA timezone');
    expect(apiErrorMessage(v('Invalid'), tr, '')).toBe('Invalid');
    expect(apiErrorMessage(v(), tr)).toBe('Validation error');
    expect(apiErrorMessage(v('  '), tr)).toBe('Validation error');
    expect(apiErrorMessage(v('body/phone Invalid'), tr)).toBe('Validation error');
    expect(apiErrorMessage(v('querystring.limit must be <= 100'), tr)).toBe('Validation error');
    expect(apiErrorMessage(v('[{"path":["phone"]}]'), tr)).toBe('Validation error');
    expect(apiErrorMessage(v('line one\nline two'), tr)).toBe('Validation error');
    expect(apiErrorMessage(v('x'.repeat(301)), tr)).toBe('Validation error');
  });

  it('falls back to the server message when the code has no translation', () => {
    expect(apiErrorMessage(new ApiError(400, { error: 'nope', code: 'UNKNOWN_CODE' }), tr)).toBe(
      'nope',
    );
  });
  it('maps a server-down ApiError to the offline copy', () => {
    expect(apiErrorMessage(new ApiError(500, null), t)).toBe('common.offline');
  });
  it('uses the server message when present', () => {
    expect(apiErrorMessage(new ApiError(400, { error: 'nope' }), t)).toBe('nope');
  });
  it('falls back to a generic message for a messageless ApiError', () => {
    expect(apiErrorMessage(new ApiError(400, {}), t)).toBe('common.somethingWrong');
  });
  it('maps a non-ApiError to the offline copy', () => {
    expect(apiErrorMessage(new Error('x'), t)).toBe('common.offline');
  });
});

describe('getApiErrorFieldDetails', () => {
  it('returns empty for a non-ApiError', () => {
    expect(getApiErrorFieldDetails(new Error('x'), t)).toEqual({});
  });
  it('returns empty when the body has no usable details', () => {
    expect(getApiErrorFieldDetails(new ApiError(400, null), t)).toEqual({});
    expect(getApiErrorFieldDetails(new ApiError(400, 'str'), t)).toEqual({});
    expect(getApiErrorFieldDetails(new ApiError(400, { details: null }), t)).toEqual({});
    expect(getApiErrorFieldDetails(new ApiError(400, { details: 'x' }), t)).toEqual({});
  });
  it('keeps only string detail values', () => {
    const err = new ApiError(400, { details: { email: 'taken', count: 5 } });
    expect(getApiErrorFieldDetails(err, t, 'en')).toEqual({ email: 'taken' });
  });
  it('maps validator messages to the app text in the app language', () => {
    const err = new ApiError(400, {
      code: 'VALIDATION_ERROR',
      details: { email: 'Invalid email', 'address/line1': 'Required', note: 'taken' },
    });
    expect(getApiErrorFieldDetails(err, t, 'de')).toEqual({
      email: 'fieldErrors.email',
      'address/line1': 'fieldErrors.required',
      note: 'fieldErrors.invalid',
    });
  });
  it('uses the i18next language by default', () => {
    const err = new ApiError(400, { details: { note: 'taken' } });
    expect(getApiErrorFieldDetails(err, t)).toEqual({ note: 'taken' });
  });
});

describe('request', () => {
  it('performs a GET and returns parsed JSON', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(resp(200, JSON.stringify({ ok: 1 })));
    await expect(api.get('/x')).resolves.toEqual({ ok: 1 });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://api.test/x',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('attaches the bearer token when authenticated', async () => {
    sess.getAccessToken.mockReturnValue('tok');
    (global.fetch as jest.Mock).mockResolvedValue(resp(200, '{}'));
    await api.get('/x');
    const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tok');
  });

  it('proactively refreshes a stale token before the call', async () => {
    sess.hasSession.mockReturnValue(true);
    sess.isAccessTokenStale.mockReturnValue(true);
    (global.fetch as jest.Mock).mockResolvedValue(resp(200, '{}'));
    await api.get('/x');
    expect(sess.refreshSession).toHaveBeenCalledTimes(1);
  });

  it('attaches attestation headers and a JSON content-type for an attested post', async () => {
    attest.getAttestationHeaders.mockResolvedValue({ 'X-Device-Attestation': 'a' });
    (global.fetch as jest.Mock).mockResolvedValue(resp(200, '{}'));
    await api.post('/login', { email: 'a' }, { auth: false, attest: true });
    const opts = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(opts.headers['X-Device-Attestation']).toBe('a');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(opts.body).toBe(JSON.stringify({ email: 'a' }));
  });

  it('wraps a transport failure as a network ApiError', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));
    await expect(api.get('/x')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('refreshes and retries once on a 401', async () => {
    sess.hasSession.mockReturnValue(true);
    sess.refreshSession.mockResolvedValue(true);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(resp(401, '{}'))
      .mockResolvedValueOnce(resp(200, JSON.stringify({ ok: 1 })));
    await expect(api.get('/x')).resolves.toEqual({ ok: 1 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('throws the 401 when the refresh fails', async () => {
    sess.hasSession.mockReturnValue(true);
    sess.refreshSession.mockResolvedValue(false);
    (global.fetch as jest.Mock).mockResolvedValue(resp(401, JSON.stringify({ error: 'no' })));
    await expect(api.get('/x')).rejects.toMatchObject({ status: 401 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('wraps a transport failure during the 401 retry', async () => {
    sess.hasSession.mockReturnValue(true);
    sess.refreshSession.mockResolvedValue(true);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(resp(401, '{}'))
      .mockRejectedValueOnce(new Error('offline'));
    await expect(api.get('/x')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('returns undefined for a 204', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(resp(204, ''));
    await expect(api.del('/x')).resolves.toBeUndefined();
  });

  it('returns undefined for an empty body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(resp(200, ''));
    await expect(api.get('/x')).resolves.toBeUndefined();
  });

  it('returns the raw text when the body is not JSON', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(resp(200, 'plain text'));
    await expect(api.get('/x')).resolves.toBe('plain text');
  });

  it('throws an ApiError carrying the parsed error body on failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(resp(400, JSON.stringify({ error: 'bad' })));
    await expect(api.get('/x')).rejects.toMatchObject({ status: 400 });
  });
});

describe('api verb wrappers', () => {
  beforeEach(() => (global.fetch as jest.Mock).mockResolvedValue(resp(200, '{}')));

  it('forwards an abort signal on get', async () => {
    const signal = new AbortController().signal;
    await api.get('/x', signal);
    expect((global.fetch as jest.Mock).mock.calls[0][1].signal).toBe(signal);
  });
  it('getData unwraps the data array from a list response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(resp(200, JSON.stringify({ data: [1, 2] })));
    await expect(api.getData<number>('/list')).resolves.toEqual([1, 2]);
  });
  it('posts without auth when requested', async () => {
    await api.post('/x', { a: 1 }, { auth: false });
    const headers = (global.fetch as jest.Mock).mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });
  it('posts with default options', async () => {
    await api.post('/x');
    expect((global.fetch as jest.Mock).mock.calls[0][1].method).toBe('POST');
  });
  it('sends patch, put, and delete with bodies', async () => {
    await api.patch('/x', { a: 1 });
    await api.put('/x', { a: 1 });
    await api.del('/x', { a: 1 });
    const methods = (global.fetch as jest.Mock).mock.calls.map((c) => c[1].method);
    expect(methods).toEqual(['PATCH', 'PUT', 'DELETE']);
  });
});
