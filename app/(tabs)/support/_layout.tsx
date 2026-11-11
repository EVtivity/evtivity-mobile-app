// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useSupportEnabled } from '@/features/app-info';

// While the operator has support turned off, the API refuses every support
// request, so a link or push into these screens goes to the home screen.
export default function SupportLayout(): React.JSX.Element {
  const supportEnabled = useSupportEnabled();
  if (!supportEnabled) return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
