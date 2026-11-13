// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { cn } from '@/lib/cn';
import { hsl, useSurfaceTextVars } from '@/lib/theme';

interface InputProps extends TextInputProps {
  error?: boolean;
  className?: string;
}

// Filled input with a 2px border that lights up to the brand ring on focus.
// One line is 52px, the height of Button and the icon send buttons beside an
// input. A multiline input starts at that height (12px padding around the
// 24px line inside the 2px border) and grows with its text up to the max
// height its caller sets.
export const Input = React.forwardRef<TextInput, InputProps>(function Input(
  { error = false, className, onFocus, onBlur, multiline, ...props },
  ref,
): React.JSX.Element {
  const surfaceVars = useSurfaceTextVars();
  const [focused, setFocused] = React.useState(false);
  const borderClass = error ? 'border-destructive' : focused ? 'border-primary' : 'border-border';

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
      style={[surfaceVars, { fontFamily: 'Inter_400Regular' }]}
      multiline={multiline}
      textAlignVertical={multiline === true ? 'top' : undefined}
      className={cn(
        'rounded-xl border-2 bg-muted px-4 text-base text-foreground',
        multiline === true ? 'min-h-[52px] py-3 leading-6' : 'h-[52px]',
        borderClass,
        className,
      )}
      {...props}
    />
  );
});
