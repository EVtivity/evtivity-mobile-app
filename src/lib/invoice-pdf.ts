// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL } from './config';
import { authorizedHeaders } from './api';
import { hasSession, refreshSession } from './session';
import { invoicePdfFileName } from './invoices';

async function download(invoiceId: string, target: File): Promise<File> {
  const headers = await authorizedHeaders();
  return File.downloadFileAsync(
    `${API_BASE_URL}/v1/portal/invoices/${encodeURIComponent(invoiceId)}/pdf`,
    target,
    { headers, idempotent: true },
  );
}

/**
 * Downloads an invoice PDF (GET /v1/portal/invoices/:id/pdf) into the cache
 * and opens the share sheet, so the driver can save, print or send it. The
 * download carries the bearer token, so it runs outside the JSON client; a
 * failure (an access token that expired mid-flight answers 401) is retried
 * once after a session refresh. Throws when the download or the share fails.
 */
export async function shareInvoicePdf(invoice: {
  id: string;
  invoiceNumber: string;
}): Promise<void> {
  const target = new File(Paths.cache, invoicePdfFileName(invoice.invoiceNumber));
  let file: File;
  try {
    file = await download(invoice.id, target);
  } catch (err) {
    if (!hasSession() || !(await refreshSession())) throw err;
    file = await download(invoice.id, target);
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: invoice.invoiceNumber,
  });
}
