// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { Stack } from 'expo-router';

// The account tab is its own stack so its subpages (personal, security,
// notifications, vehicles, RFID, payment methods) push within the tab and the
// bottom tab bar stays visible. Each screen renders its own back control.
// Anchor at index so re-pressing the tab returns to the account main screen.
export const unstable_settings = { initialRouteName: 'index' };

export default function AccountStackLayout(): React.JSX.Element {
  return <Stack screenOptions={{ headerShown: false }} />;
}
