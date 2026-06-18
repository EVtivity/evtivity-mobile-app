// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Nfc } from '@/components/icons';
import {
  Screen,
  Text,
  Button,
  AddButton,
  Field,
  Sheet,
  Spinner,
  EmptyState,
  BackButton,
  ListItemCard,
  useToast,
  useConfirm,
} from '@/components/ui';
import { hsl } from '@/lib/theme';
import { apiErrorMessage } from '@/lib/api';
import { useRfidTokens, useAddRfidToken, useToggleRfidToken } from '@/features/account';

function maskToken(value: string): string {
  if (value.length <= 4) return value;
  return `${'•'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

export default function RfidScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const toast = useToast();

  const confirm = useConfirm();

  const tokens = useRfidTokens();
  const addToken = useAddRfidToken();
  const toggleToken = useToggleRfidToken();

  const [open, setOpen] = React.useState(false);
  const [idToken, setIdToken] = React.useState('');
  // Per-token optimistic active state so the controlled Switch reflects the
  // user's toggle immediately instead of fighting the round-trip value.
  const [pendingActive, setPendingActive] = React.useState<Record<string, boolean>>({});

  const clearPending = React.useCallback((id: string) => {
    setPendingActive((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
  }, []);

  const onAdd = async (): Promise<void> => {
    try {
      await addToken.mutateAsync({ idToken: idToken.trim() });
      setIdToken('');
      setOpen(false);
      toast.show(t('account.addRfid'), 'success');
    } catch (err) {
      toast.show(
        apiErrorMessage(err, t),
        'error',
      );
    }
  };

  const runToggle = React.useCallback(
    async (id: string, isActive: boolean): Promise<void> => {
      if (!isActive) {
        const ok = await confirm({
          title: t('account.deactivateRfidTitle'),
          message: t('account.deactivateRfidMessage'),
          confirmText: t('common.deactivate'),
          destructive: true,
        });
        if (!ok) {
          clearPending(id);
          return;
        }
      }
      toggleToken.mutate(
        { id, isActive },
        {
          onError: (err) => {
            clearPending(id);
            toast.show(apiErrorMessage(err, t), 'error');
          },
          onSuccess: () => clearPending(id),
        },
      );
    },
    [confirm, toggleToken, toast, t, clearPending],
  );

  const onToggle = React.useCallback(
    (id: string, isActive: boolean): void => {
      // Reflect the toggle immediately so the controlled Switch does not snap
      // back and fight the native gesture.
      setPendingActive((m) => ({ ...m, [id]: isActive }));
      // Defer the confirm dialog out of the native Switch callback. Mounting a
      // Modal synchronously from a native switch event wedges the screen on the
      // new architecture; a microtask lets the gesture settle first.
      setTimeout(() => void runToggle(id, isActive), 0);
    },
    [runToggle],
  );

  const items = tokens.data ?? [];

  return (
    <Screen scroll>
      <BackButton />
      <Text variant="h1" className="mb-4">
        {t('account.rfid')}
      </Text>

      <AddButton testID="rfid-add" title={t('account.addRfid')} onPress={() => setOpen(true)} />

      {tokens.isLoading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Nfc size={40} color={hsl('mutedForeground')} />}
          title={t('account.noRfid')}
        />
      ) : (
        <View className="gap-3">
          {items.map((tok) => (
            <ListItemCard
              key={tok.id}
              title={maskToken(tok.idToken)}
              subtitle={tok.tokenType}
              right={
                <Switch
                  testID={`rfid-switch-${tok.idToken}`}
                  value={pendingActive[tok.id] ?? tok.isActive}
                  onValueChange={(v) => onToggle(tok.id, v)}
                  trackColor={{ true: hsl('primary'), false: hsl('muted') }}
                />
              }
            />
          ))}
        </View>
      )}

      <Sheet visible={open} onClose={() => setOpen(false)} title={t('account.addRfid')}>
        <Field
          testID="rfid-card-input"
          label={t('account.cardNumber')}
          value={idToken}
          onChangeText={setIdToken}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <Button
          testID="rfid-submit"
          title={t('common.add')}
          loading={addToken.isPending}
          disabled={idToken.trim().length < 4}
          onPress={() => void onAdd()}
        />
      </Sheet>
    </Screen>
  );
}
