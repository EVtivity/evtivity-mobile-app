// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

const mockDownload = jest.fn();
const mockShare = jest.fn();
const mockHeaders = jest.fn();
const mockHasSession = jest.fn();
const mockRefresh = jest.fn();

jest.mock('expo-file-system', () => {
  class File {
    readonly uri: string;
    constructor(dir: { uri: string }, name: string) {
      this.uri = `${dir.uri}/${name}`;
    }
    static downloadFileAsync = (...args: unknown[]) => mockDownload(...args);
  }
  return { File, Paths: { cache: { uri: 'file:///cache' } } };
});

jest.mock('expo-sharing', () => ({
  shareAsync: (...args: unknown[]) => mockShare(...args),
}));

jest.mock('@/lib/config', () => ({ API_BASE_URL: 'https://api.example.com' }));

jest.mock('@/lib/api', () => ({
  authorizedHeaders: () => mockHeaders(),
}));

jest.mock('@/lib/session', () => ({
  hasSession: () => mockHasSession(),
  refreshSession: () => mockRefresh(),
}));

import { shareInvoicePdf } from '@/lib/invoice-pdf';

const INVOICE = { id: 'inv_1', invoiceNumber: 'INV-2026-0001' };

beforeEach(() => {
  jest.clearAllMocks();
  mockHeaders.mockResolvedValue({ Authorization: 'Bearer t1' });
  mockHasSession.mockReturnValue(true);
  mockRefresh.mockResolvedValue(true);
  mockShare.mockResolvedValue(undefined);
});

describe('shareInvoicePdf', () => {
  it('downloads the PDF with the bearer token and opens the share sheet', async () => {
    mockDownload.mockResolvedValue({ uri: 'file:///cache/INV-2026-0001.pdf' });

    await shareInvoicePdf(INVOICE);

    expect(mockDownload).toHaveBeenCalledTimes(1);
    const [url, target, options] = mockDownload.mock.calls[0] as [
      string,
      { uri: string },
      { headers: Record<string, string>; idempotent: boolean },
    ];
    expect(url).toBe('https://api.example.com/v1/portal/invoices/inv_1/pdf');
    expect(target.uri).toBe('file:///cache/INV-2026-0001.pdf');
    expect(options).toEqual({ headers: { Authorization: 'Bearer t1' }, idempotent: true });
    expect(mockShare).toHaveBeenCalledWith('file:///cache/INV-2026-0001.pdf', {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'INV-2026-0001',
    });
  });

  it('retries once after a session refresh when the download fails', async () => {
    mockDownload
      .mockRejectedValueOnce(new Error('UnableToDownload 401'))
      .mockResolvedValueOnce({ uri: 'file:///cache/INV-2026-0001.pdf' });
    mockHeaders
      .mockResolvedValueOnce({ Authorization: 'Bearer old' })
      .mockResolvedValueOnce({ Authorization: 'Bearer new' });

    await shareInvoicePdf(INVOICE);

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockDownload).toHaveBeenCalledTimes(2);
    expect((mockDownload.mock.calls[1] as unknown[])[2]).toEqual({
      headers: { Authorization: 'Bearer new' },
      idempotent: true,
    });
    expect(mockShare).toHaveBeenCalledTimes(1);
  });

  it('throws without sharing when the refresh fails', async () => {
    mockDownload.mockRejectedValue(new Error('UnableToDownload 404'));
    mockRefresh.mockResolvedValue(false);

    await expect(shareInvoicePdf(INVOICE)).rejects.toThrow('UnableToDownload 404');
    expect(mockDownload).toHaveBeenCalledTimes(1);
    expect(mockShare).not.toHaveBeenCalled();
  });
});
