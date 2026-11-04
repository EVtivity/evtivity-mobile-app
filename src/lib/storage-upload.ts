// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

// The phone side of a presigned upload, as the CSMS and the portal send it
// (`sendStorageUpload` in the CSMS repo). An upload-url reply says how to send
// the file: a form POST of the policy fields and the file (AWS S3 and
// S3-compatible providers), or on Cloudflare R2 (`uploadMethod` PUT) a PUT of
// the file signed for exactly its size, with the signed headers.

export interface StorageUploadTicket {
  uploadUrl: string;
  /** Missing from a CSMS older than PUT uploads: a POST. */
  uploadMethod?: 'POST' | 'PUT';
  /** Form fields of a POST, sent unchanged before the file. */
  fields: Record<string, string>;
  /** Headers of a PUT, sent unchanged. */
  uploadHeaders?: Record<string, string>;
}

export interface StorageUploadFile {
  uri: string;
  name: string;
  type: string;
}

/**
 * Sends the picked file to storage and returns the provider's response; the
 * caller checks `ok`. A PUT reads the file from its local URI as a Blob, so the
 * body has the size the URL was signed for.
 */
export async function sendStorageUpload(
  ticket: StorageUploadTicket,
  file: StorageUploadFile,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (ticket.uploadMethod === 'PUT') {
    const body = await (await fetchImpl(file.uri)).blob();
    return fetchImpl(ticket.uploadUrl, {
      method: 'PUT',
      headers: ticket.uploadHeaders ?? {},
      body,
    });
  }
  const form = new FormData();
  for (const [name, value] of Object.entries(ticket.fields)) form.append(name, value);
  // React Native sends a { uri, name, type } part as the file.
  form.append('file', { uri: file.uri, name: file.name, type: file.type } as never);
  return fetchImpl(ticket.uploadUrl, { method: 'POST', body: form });
}
