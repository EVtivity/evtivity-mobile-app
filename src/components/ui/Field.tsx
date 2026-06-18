// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from './Text';
import { Input } from './Input';
import { Eye, EyeSlash } from '@/components/icons';
import { hsl } from '@/lib/theme';
import type { TextInputProps } from 'react-native';

interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
  helper?: string;
  labelClassName?: string;
}

export function Field({
  label,
  error,
  helper,
  labelClassName,
  ...inputProps
}: FieldProps): React.JSX.Element {
  const isPassword = inputProps.secureTextEntry === true;
  const [reveal, setReveal] = React.useState(false);

  return (
    <View className="gap-2">
      <Text variant="label" className={labelClassName}>
        {label}
      </Text>
      <View className="justify-center">
        <Input
          error={error != null}
          {...inputProps}
          secureTextEntry={isPassword && !reveal}
          className={isPassword ? 'pr-12' : undefined}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setReveal((v) => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={reveal ? 'Hide password' : 'Show password'}
            className="absolute right-3"
          >
            {reveal ? (
              <EyeSlash size={22} color={hsl('mutedForeground')} />
            ) : (
              <Eye size={22} color={hsl('mutedForeground')} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error != null ? (
        <Text className="mt-0.5 text-[13px] text-destructive">{error}</Text>
      ) : helper != null ? (
        <Text className="mt-0.5 text-[13px] text-muted-foreground">{helper}</Text>
      ) : null}
    </View>
  );
}
