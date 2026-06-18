// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { Stack } from 'expo-router';

// Anchor the stack at its index so any entry path (deep link, tab re-press)
// keeps the tab's main screen as the root to return to.
export const unstable_settings = { initialRouteName: 'index' };

export default function ReservationsLayout(): React.JSX.Element {
  return <Stack screenOptions={{ headerShown: false }} />;
}
