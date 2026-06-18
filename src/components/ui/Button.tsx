// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { ActivityIndicator, View, type PressableProps } from 'react-native';
import { Text } from './Text';
import { PressableScale } from './PressableScale';
import { useSurface } from './surface';
import { cn } from '@/lib/cn';
import { hsl } from '@/lib/theme';
import { shadow, glow } from '@/lib/shadow';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type Size = 'default' | 'lg' | 'sm';

const SIZE: Record<Size, string> = {
  default: 'h-[52px] px-5',
  lg: 'h-[58px] px-6',
  sm: 'h-10 px-4',
};

const TEXT_SIZE: Record<Size, string> = {
  default: 'text-base',
  lg: 'text-base',
  sm: 'text-sm',
};

interface ButtonProps extends PressableProps {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  className?: string;
}

export function Button({
  title,
  variant = 'primary',
  size = 'default',
  loading = false,
  leftIcon,
  disabled,
  className,
  ...props
}: ButtonProps): React.JSX.Element {
  const onBg = useSurface() === 'background';
  const isDisabled = disabled === true || loading;

  // Secondary / outline / ghost are translucent glass on the branded backdrop
  // (white label) and solid-light inside cards (dark label). Primary and
  // destructive stay solid everywhere.
  const container =
    variant === 'primary'
      ? ''
      : variant === 'destructive'
        ? 'bg-destructive'
        : variant === 'secondary'
          ? onBg
            ? 'border border-white/20 bg-white/15'
            : 'bg-muted'
          : variant === 'outline'
            ? onBg
              ? 'border border-white/30 bg-white/10'
              : 'border border-border bg-card'
            : 'bg-transparent'; // ghost

  const label =
    variant === 'primary' || variant === 'destructive'
      ? 'text-white'
      : onBg
        ? 'text-white'
        : variant === 'ghost'
          ? 'text-primary'
          : 'text-foreground';

  const contentColor =
    variant === 'primary' || variant === 'destructive' || onBg
      ? '#fff'
      : variant === 'ghost'
        ? hsl('primary')
        : hsl('foreground');

  const elevation =
    variant === 'primary' ? glow(hsl('cta')) : variant === 'destructive' ? shadow.sm : undefined;
  const bgStyle = variant === 'primary' ? { backgroundColor: hsl('cta') } : undefined;

  const icon =
    leftIcon != null && React.isValidElement(leftIcon)
      ? React.cloneElement(leftIcon as React.ReactElement<{ color?: string }>, { color: contentColor })
      : leftIcon;

  return (
    <PressableScale
      accessibilityRole="button"
      haptic={!isDisabled}
      disabled={isDisabled}
      style={[isDisabled ? undefined : elevation, bgStyle]}
      className={cn(
        'flex-row items-center justify-center gap-2 rounded-xl',
        SIZE[size],
        container,
        isDisabled && 'opacity-40',
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <>
          {icon != null ? <View>{icon}</View> : null}
          <Text weight="semibold" className={cn(TEXT_SIZE[size], label)}>
            {title}
          </Text>
        </>
      )}
    </PressableScale>
  );
}
