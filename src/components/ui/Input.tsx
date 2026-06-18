// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { cn } from '@/lib/cn';
import { hsl, SURFACE_TEXT_VARS } from '@/lib/theme';

interface InputProps extends TextInputProps {
  error?: boolean;
  className?: string;
}

// Filled input with a 2px border that lights up to the brand ring on focus.
export const Input = React.forwardRef<TextInput, InputProps>(function Input(
  { error = false, className, onFocus, onBlur, ...props },
  ref,
): React.JSX.Element {
  const [focused, setFocused] = React.useState(false);
  const borderClass = error
    ? 'border-destructive'
    : focused
      ? 'border-primary'
      : 'border-border';

  return (
    <TextInput
      ref={ref}
      placeholderTextColor={hsl('mutedForeground')}
      onFocus={(e) => {
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      style={[SURFACE_TEXT_VARS, { fontFamily: 'Inter_400Regular' }]}
      className={cn(
        'h-[52px] rounded-xl border-2 bg-muted px-4 text-base text-foreground',
        borderClass,
        className,
      )}
      {...props}
    />
  );
});
