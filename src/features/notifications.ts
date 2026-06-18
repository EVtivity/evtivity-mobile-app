// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Paginated } from '@/lib/types';

// The portal notifications endpoint returns the push-channel rows. It does not
// include a body field, only subject/eventType (the drawer shows the summary).
export interface PortalNotification {
  id: number;
  channel: string;
  subject: string | null;
  eventType: string | null;
  createdAt: string;
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () =>
      api
        .get<Paginated<PortalNotification>>('/v1/portal/notifications?limit=50')
        .then((r) => r.data),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () =>
      api.get<{ count: number }>('/v1/portal/notifications/unread-count').then((r) => r.count),
    refetchInterval: 60_000,
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ success: true }>('/v1/portal/notifications/mark-read'),
    onSuccess: () => {
      qc.setQueryData(['notifications', 'unread-count'], 0);
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
