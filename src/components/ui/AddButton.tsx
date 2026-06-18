// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { Plus } from '@/components/icons';
import { hsl } from '@/lib/theme';
import { Button } from './Button';

type AddButtonProps = Omit<React.ComponentProps<typeof Button>, 'leftIcon'>;

// The standard full-width "create" action (New Reservation, New Case, Add Card,
// Add Vehicle, Add RFID). Defaults to the translucent glass variant; callers may
// still pass `variant`. Centralized so every screen stays consistent. The Button
// recolors the icon to match the resolved variant and surface.
export function AddButton(props: AddButtonProps): React.JSX.Element {
  return (
    <Button
      variant="secondary"
      {...props}
      leftIcon={<Plus size={18} color={hsl('primaryForeground')} />}
    />
  );
}
