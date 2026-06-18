// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { Check } from '@/components/icons';
import { Card } from './Card';
import { Text } from './Text';
import { hsl } from '@/lib/theme';

// Inline form success, the success-toned counterpart to FormError. Renders on
// the standard translucent card surface with a check icon and success text so
// confirmation messages stay legible and consistent on the green backdrop.
export function FormSuccess({ message }: { message: string }): React.JSX.Element {
  return (
    <Card className="flex-row items-center gap-2.5 p-3.5">
      <Check size={18} color={hsl('success')} />
      <Text className="flex-1 text-sm text-success">{message}</Text>
    </Card>
  );
}
