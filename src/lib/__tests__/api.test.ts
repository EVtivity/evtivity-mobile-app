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
  getApiErrorFieldDetails,
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
});

describe('apiErrorMessage', () => {
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
    expect(getApiErrorFieldDetails(new Error('x'))).toEqual({});
  });
  it('returns empty when the body has no usable details', () => {
    expect(getApiErrorFieldDetails(new ApiError(400, null))).toEqual({});
    expect(getApiErrorFieldDetails(new ApiError(400, 'str'))).toEqual({});
    expect(getApiErrorFieldDetails(new ApiError(400, { details: null }))).toEqual({});
    expect(getApiErrorFieldDetails(new ApiError(400, { details: 'x' }))).toEqual({});
  });
  it('keeps only string detail values', () => {
    const err = new ApiError(400, { details: { email: 'taken', count: 5 } });
    expect(getApiErrorFieldDetails(err)).toEqual({ email: 'taken' });
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
