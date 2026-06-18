// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { Redirect } from 'expo-router';

// The root navigator's auth redirect handles the real routing; this entry just
// points at the tabs so a cold launch has a concrete initial route.
export default function Index(): React.JSX.Element {
  return <Redirect href="/(tabs)" />;
}
