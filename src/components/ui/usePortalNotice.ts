// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import { useConfirm } from './ConfirmDialog';
import { useToast } from './Toast';

/**
 * Returns a callback that tells the driver to make a change in the driver
 * portal (one that needs a fresh factor proof, which this app does not give).
 * With a portal URL it asks in a dialog and opens the page on "Open Portal";
 * without one (no portal URL is known) it shows the message as a toast.
 */
export function usePortalNotice(): (message: string, url: string | null) => Promise<void> {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const toast = useToast();
  return useCallback(
    async (message: string, url: string | null) => {
      if (url == null) {
        toast.show(message, 'error');
        return;
      }
      const ok = await confirm({
        title: t('account.portalTitle'),
        message,
        confirmText: t('account.openPortal'),
        cancelText: t('common.close'),
      });
      if (ok) await WebBrowser.openBrowserAsync(url);
    },
    [confirm, t, toast],
  );
}
