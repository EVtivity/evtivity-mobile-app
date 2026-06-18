// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { Stack } from 'expo-router';

export default function SessionStackLayout(): React.JSX.Element {
  return <Stack screenOptions={{ headerShown: false }} />;
}
