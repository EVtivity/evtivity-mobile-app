// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { CardSurface } from './surface';
import { shadow } from '@/lib/shadow';
import { SURFACE_TEXT_VARS } from '@/lib/theme';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn>(() => Promise.resolve(false));

export function useConfirm(): ConfirmFn {
  return React.useContext(ConfirmContext);
}

interface PendingState {
  opts: ConfirmOptions;
  resolve: (value: boolean) => void;
}

// App-wide confirmation dialog. Any destructive action awaits `confirm({...})`
// and only proceeds when the user taps the confirm button. Renders a centered
// glass card over a dim backdrop.
export function ConfirmProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [pending, setPending] = React.useState<PendingState | null>(null);

  const confirm = React.useCallback<ConfirmFn>(
    (opts) => new Promise<boolean>((resolve) => setPending({ opts, resolve })),
    [],
  );

  const settle = (value: boolean): void => {
    pending?.resolve(value);
    setPending(null);
  };

  const opts = pending?.opts;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {/* In-tree overlay instead of react-native Modal: Modal renders blank /
          freezes on the New Architecture (Fabric/Bridgeless) on this RN version.
          An absolute overlay (like Toast) renders reliably. */}
      {/* No elevation on the overlay: an elevated full-screen view casts an
          ambient edge shadow that darkens the outer tint (inner lighter, outer
          darker). zIndex stacks it above the navigator without a shadow. */}
      {pending != null ? (
        <View className="absolute inset-0 z-50 items-center justify-center bg-black/60 px-8">
          <Pressable className="absolute inset-0" onPress={() => settle(false)} />
          <View
            style={[shadow.xl, SURFACE_TEXT_VARS]}
            className="w-full max-w-sm rounded-2xl border border-white/20 bg-card p-5"
          >
            <CardSurface>
              <Text variant="h3" className="mb-1.5">
                {opts?.title ?? ''}
              </Text>
              {opts?.message != null ? (
                <Text variant="muted" className="mb-5 leading-relaxed">
                  {opts.message}
                </Text>
              ) : (
                <View className="mb-5" />
              )}
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button title={opts?.cancelText ?? 'Cancel'} variant="secondary" onPress={() => settle(false)} />
                </View>
                <View className="flex-1">
                  <Button
                    title={opts?.confirmText ?? 'Confirm'}
                    variant={opts?.destructive === false ? 'primary' : 'destructive'}
                    onPress={() => settle(true)}
                  />
                </View>
              </View>
            </CardSurface>
          </View>
        </View>
      ) : null}
    </ConfirmContext.Provider>
  );
}
