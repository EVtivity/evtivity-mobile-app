// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { sendStorageUpload } from '@/lib/storage-upload';

const FILE = { uri: 'file:///avatar.png', name: 'avatar.png', type: 'image/png' };

function fakeFetch(blob: Blob) {
  return jest.fn(async (input: unknown, init?: RequestInit) => {
    if (input === FILE.uri && init == null) return { blob: async () => blob } as Response;
    return { ok: true, status: 200 } as Response;
  });
}

describe('sendStorageUpload', () => {
  it('PUTs the file with the signed headers when the reply says PUT (Cloudflare R2)', async () => {
    const blob = new Blob(['png-bytes'], { type: 'image/png' });
    const fetchImpl = fakeFetch(blob);
    const res = await sendStorageUpload(
      {
        uploadUrl: 'https://r2.example/bucket/key?X-Amz-Signature=x',
        uploadMethod: 'PUT',
        fields: {},
        uploadHeaders: { 'Content-Type': 'image/png' },
      },
      FILE,
      fetchImpl as unknown as typeof fetch,
    );
    expect(res.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(FILE.uri);
    const [url, init] = fetchImpl.mock.calls[1] ?? [];
    expect(url).toBe('https://r2.example/bucket/key?X-Amz-Signature=x');
    expect(init?.method).toBe('PUT');
    expect(init?.headers).toEqual({ 'Content-Type': 'image/png' });
    expect(init?.body).toBe(blob);
  });

  it.each([['POST' as const], [undefined]])(
    'POSTs the policy fields and the file when the method is %s',
    async (uploadMethod) => {
      const fetchImpl = fakeFetch(new Blob());
      await sendStorageUpload(
        {
          uploadUrl: 'https://s3.example/bucket',
          ...(uploadMethod != null ? { uploadMethod } : {}),
          fields: { key: 'quarantine/key', policy: 'p' },
        },
        FILE,
        fetchImpl as unknown as typeof fetch,
      );
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      const [url, init] = fetchImpl.mock.calls[0] ?? [];
      expect(url).toBe('https://s3.example/bucket');
      expect(init?.method).toBe('POST');
      const form = init?.body as FormData;
      expect(form).toBeInstanceOf(FormData);
      expect(form.get('key')).toBe('quarantine/key');
      expect(form.get('policy')).toBe('p');
    },
  );

  it('PUTs with no headers when the reply lists none', async () => {
    const fetchImpl = fakeFetch(new Blob(['x']));
    await sendStorageUpload(
      { uploadUrl: 'https://r2.example/k', uploadMethod: 'PUT', fields: {} },
      FILE,
      fetchImpl as unknown as typeof fetch,
    );
    expect(fetchImpl.mock.calls[1]?.[1]?.headers).toEqual({});
  });

  it('uses the global fetch when none is given', async () => {
    const original = global.fetch;
    const fetchImpl = fakeFetch(new Blob());
    global.fetch = fetchImpl as unknown as typeof fetch;
    try {
      await sendStorageUpload({ uploadUrl: 'https://s3.example/bucket', fields: {} }, FILE);
      expect(fetchImpl).toHaveBeenCalledWith(
        'https://s3.example/bucket',
        expect.objectContaining({ method: 'POST' }),
      );
    } finally {
      global.fetch = original;
    }
  });
});
