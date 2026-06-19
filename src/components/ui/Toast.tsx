// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from './Text';
import { cn } from '@/lib/cn';
import { shadow } from '@/lib/shadow';

type ToastTone = 'default' | 'success' | 'error';
interface ToastMessage {
  id: number;
  text: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (text: string, tone?: ToastTone) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);
  const idRef = React.useRef(0);
  const timersRef = React.useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const show = React.useCallback((text: string, tone: ToastTone = 'default') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, text, tone }]);
    const handle = setTimeout(() => {
      timersRef.current.delete(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
    timersRef.current.set(id, handle);
  }, []);

  // Clear any pending dismiss timers if the provider unmounts.
  React.useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((h) => clearTimeout(h));
      timers.clear();
    };
  }, []);

  // Stable context value so every useToast() consumer doesn't re-render on each
  // provider render (toasts cycle every few seconds).
  const value = React.useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <SafeAreaView
        edges={['top']}
        pointerEvents="none"
        className="absolute inset-x-0 top-0 items-center"
      >
        <View className="w-full gap-2 px-4 pt-2">
          {toasts.map((t) => (
            <Animated.View
              key={t.id}
              entering={FadeInUp.springify().damping(18)}
              exiting={FadeOutUp.duration(200)}
              style={shadow.lg}
              className={cn(
                'rounded-2xl px-4 py-3.5',
                t.tone === 'success'
                  ? 'bg-success'
                  : t.tone === 'error'
                    ? 'bg-destructive'
                    : 'bg-foreground',
              )}
            >
              <Text weight="semibold" className="text-sm text-background">
                {t.text}
              </Text>
            </Animated.View>
          ))}
        </View>
      </SafeAreaView>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (ctx == null) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
