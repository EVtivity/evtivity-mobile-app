// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { Alert } from 'react-native';
import i18n from '@/lib/i18n';

// A single, deduped "server unreachable" popup. Many requests can fail at once
// when the network or CSMS API is down; this shows one friendly alert rather
// than a stack of raw "Network request failed" errors.
const COOLDOWN_MS = 6000;
let lastShownAt = 0;
let visible = false;

export function notifyServerUnreachable(): void {
  const now = Date.now();
  if (visible || now - lastShownAt < COOLDOWN_MS) return;
  visible = true;
  lastShownAt = now;
  const dismiss = (): void => {
    visible = false;
  };
  Alert.alert(
    i18n.t('common.offlineTitle'),
    i18n.t('common.offline'),
    [{ text: i18n.t('common.ok'), onPress: dismiss }],
    { onDismiss: dismiss },
  );
}
