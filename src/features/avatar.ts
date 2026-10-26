// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import type { DriverAvatar, GeneratedAvatar } from '@/lib/avatar';

// The driver's avatar (GET /v1/portal/driver/avatar). An image URL is valid for
// an hour, so it is fetched again after 30 minutes.
export const AVATAR_KEY = ['driver-avatar'] as const;

interface AvatarReply {
  avatar: DriverAvatar | null;
}

export function useDriverAvatar(enabled = true) {
  return useQuery({
    queryKey: AVATAR_KEY,
    queryFn: async () => (await api.get<AvatarReply>('/v1/portal/driver/avatar')).avatar,
    staleTime: 30 * 60_000,
    enabled,
  });
}

function useAvatarMutation<I>(run: (input: I) => Promise<DriverAvatar | null>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: (avatar) => {
      qc.setQueryData(AVATAR_KEY, avatar);
    },
  });
}

// Stores a generated avatar (replaces an uploaded image).
export function useSetAvatar() {
  return useAvatarMutation(async (avatar: GeneratedAvatar) => {
    const reply = await api.put<AvatarReply>('/v1/portal/driver/avatar', avatar);
    return reply.avatar;
  });
}

// Removes the avatar: the app shows initials.
export function useRemoveAvatar() {
  return useAvatarMutation(async () => {
    await api.del<AvatarReply>('/v1/portal/driver/avatar');
    return null;
  });
}

export interface PickedImage {
  uri: string;
  mimeType: string;
  fileName: string;
  size: number;
}

interface UploadTicket {
  uploadUrl: string;
  fields: Record<string, string>;
  s3Key: string;
  s3Bucket: string;
}

// Uploads an image: an upload URL, the multipart POST of the policy fields and
// the file to S3, then the confirm that crops it to a square and stores it.
export function useUploadAvatar() {
  return useAvatarMutation(async (image: PickedImage) => {
    const ticket = await api.post<UploadTicket>('/v1/portal/driver/avatar/upload-url', {
      fileName: image.fileName,
      contentType: image.mimeType,
      fileSize: image.size,
    });
    const form = new FormData();
    for (const [name, value] of Object.entries(ticket.fields)) form.append(name, value);
    // React Native sends a { uri, name, type } part as the file.
    form.append('file', { uri: image.uri, name: image.fileName, type: image.mimeType } as never);
    let uploaded: Response;
    try {
      uploaded = await fetch(ticket.uploadUrl, { method: 'POST', body: form });
    } catch {
      throw new ApiError(0, { error: 'Network request failed', code: 'NETWORK_ERROR' });
    }
    if (!uploaded.ok) {
      // S3 refused the file against the policy (size or type).
      throw new ApiError(400, { error: 'Upload refused', code: 'AI_ATTACHMENT_REJECTED' });
    }
    const reply = await api.post<AvatarReply>('/v1/portal/driver/avatar/image', {
      s3Key: ticket.s3Key,
      s3Bucket: ticket.s3Bucket,
    });
    return reply.avatar;
  });
}
