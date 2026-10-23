// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError, apiErrorMessage, portalPageUrl, portalReasonMessage } from '@/lib/api';
import { useToast } from './Toast';
import { usePortalNotice } from './usePortalNotice';

export interface ApiErrorToastOptions {
  /** The portal page a refusal with a portalUrl opens (default: the portal home). */
  portalPath?: string;
  /**
   * Why the portal, in the app language, when the screen knows the change
   * (default: by the error code, never the server's English message).
   */
  portalMessage?: string;
}

// Returns a callback that shows a thrown error as an error toast, mapping it to
// the friendly translated/offline copy. Collapses the repeated
// `toast.show(apiErrorMessage(err, t), 'error')` idiom at every mutation site.
// A refusal that names the driver portal (portalUrl) shows a localized reason
// with an "Open Portal" action instead.
export function useApiErrorToast(): (err: unknown, opts?: ApiErrorToastOptions) => void {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const portalNotice = usePortalNotice();
  return useCallback(
    (err: unknown, opts?: ApiErrorToastOptions) => {
      if (err instanceof ApiError && err.portalUrl != null) {
        void portalNotice(
          opts?.portalMessage ?? portalReasonMessage(err, t),
          portalPageUrl(err.portalUrl, opts?.portalPath ?? '/'),
        );
        return;
      }
      toast.show(apiErrorMessage(err, t, i18n.language), 'error');
    },
    [t, i18n, toast, portalNotice],
  );
}
