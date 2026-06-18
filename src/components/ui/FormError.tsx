// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { AlertTriangle } from '@/components/icons';
import { Card } from './Card';
import { Text } from './Text';
import { hsl } from '@/lib/theme';

// Inline form error. Renders on the standard translucent card surface with an
// alert icon and red text, so the message stays legible on the branded green
// backdrop without a hard red outline.
export function FormError({ message }: { message: string }): React.JSX.Element {
  return (
    <Card className="flex-row items-center gap-2.5 p-3.5">
      <AlertTriangle size={18} color={hsl('destructive')} />
      <Text className="flex-1 text-sm text-destructive">{message}</Text>
    </Card>
  );
}
