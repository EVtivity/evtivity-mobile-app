// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { CreditCard, Trash2, Star } from '@/components/icons';
import {
  Screen,
  Text,
  Badge,
  Button,
  AddButton,
  Spinner,
  EmptyState,
  BackButton,
  ListItemCard,
  useToast,
  useApiErrorToast,
  useConfirm,
} from '@/components/ui';
import { hsl } from '@/lib/theme';
import { ApiError } from '@/lib/api';
import { resolvePaymentModule, type ClientConfig } from '@/lib/payment-provider';
import {
  getPaymentModule,
  usePaymentMethods,
  usePaymentProvider,
  useSetDefaultCard,
  useDeleteCard,
  REGISTERED_PAYMENT_PROVIDERS,
  type MobilePaymentModule,
  type PaymentCard,
} from '@/features/payments';

function formatBrand(brand: string | null): string | null {
  if (brand == null || brand.length === 0) return null;
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

function CardList({
  module,
  config,
}: {
  module: MobilePaymentModule;
  config: ClientConfig;
}): React.JSX.Element {
  const { t } = useTranslation();
  const toast = useToast();
  const showApiError = useApiErrorToast();

  const confirm = useConfirm();

  const methods = usePaymentMethods();
  const addCard = module.useAddCard(config);
  const setDefault = useSetDefaultCard();
  const deleteCard = useDeleteCard();

  const [adding, setAdding] = React.useState(false);

  const onAdd = async (): Promise<void> => {
    setAdding(true);
    try {
      const result = await addCard();
      if (result === 'added') {
        toast.show(t('payments.setupComplete'), 'success');
      }
    } catch (err) {
      toast.show(
        err instanceof ApiError
          ? (err.serverMessage ?? t('common.somethingWrong'))
          : err instanceof Error
            ? err.message
            : t('common.offline'),
        'error',
      );
    } finally {
      setAdding(false);
    }
  };

  const onSetDefault = (pmId: number): void => {
    setDefault.mutate(pmId, {
      onError: (err) => showApiError(err),
    });
  };

  const onDelete = async (pm: PaymentCard): Promise<void> => {
    const ok = await confirm({
      title: t('account.removeCardTitle'),
      message: t('account.removeCardMessage'),
      confirmText: t('common.remove'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteCard.mutateAsync(pm.id);
      toast.show(t('payments.cardRemoved'), 'success');
    } catch (err) {
      showApiError(err);
    }
  };

  const items = methods.data ?? [];
  const Overlay = module.Overlay;

  return (
    <>
      <AddButton
        testID="payment-add-card"
        title={t('payments.addCard')}
        loading={adding}
        onPress={() => void onAdd()}
      />

      {methods.isLoading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<CreditCard size={40} color={hsl('mutedForeground')} />}
          title={t('payments.title')}
        />
      ) : (
        <View className="gap-3">
          {items.map((pm) => (
            <ListItemCard
              key={pm.id}
              left={<CreditCard size={20} color={hsl('foreground')} />}
              title={`${formatBrand(pm.cardBrand) ?? t('charge.card')} •••• ${pm.cardLast4 ?? '----'}`}
              right={
                pm.isDefault ? <Badge label={t('payments.default')} variant="success" /> : undefined
              }
              footer={
                <View className="flex-row gap-2">
                  {!pm.isDefault ? (
                    <Button
                      title={t('payments.setDefault')}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      leftIcon={<Star size={16} color={hsl('foreground')} />}
                      onPress={() => onSetDefault(pm.id)}
                    />
                  ) : null}
                  <Button
                    title={t('common.remove')}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    leftIcon={<Trash2 size={16} color={hsl('destructive')} />}
                    onPress={() => void onDelete(pm)}
                  />
                </View>
              }
            />
          ))}
        </View>
      )}

      {Overlay != null ? <Overlay /> : null}
    </>
  );
}

function ProviderCardList({
  module,
  config,
}: {
  module: MobilePaymentModule;
  config: ClientConfig;
}): React.JSX.Element {
  const list = <CardList module={module} config={config} />;
  const Provider = module.Provider;
  return Provider != null ? <Provider config={config}>{list}</Provider> : list;
}

function PaymentMethodsBody(): React.JSX.Element {
  const { t } = useTranslation();
  const descriptor = usePaymentProvider();

  if (descriptor.isLoading) return <Spinner />;

  if (descriptor.isError || descriptor.data == null) {
    return (
      <EmptyState
        title={t('common.somethingWrong')}
        action={<Button title={t('common.retry')} onPress={() => void descriptor.refetch()} />}
      />
    );
  }

  const resolved = resolvePaymentModule(descriptor.data, REGISTERED_PAYMENT_PROVIDERS);
  const module = resolved.kind === 'module' ? getPaymentModule(resolved.id) : null;
  const config = descriptor.data.provider;

  if (resolved.kind === 'unsupported') {
    return (
      <EmptyState
        icon={<CreditCard size={40} color={hsl('mutedForeground')} />}
        title={t('payments.providerNotSupported')}
      />
    );
  }

  if (module == null || config == null) {
    return (
      <EmptyState
        icon={<CreditCard size={40} color={hsl('mutedForeground')} />}
        title={t('payments.notConfigured')}
      />
    );
  }

  // Keyed by provider so an operator switching providers remounts the module
  // and its hooks instead of reusing the previous provider's state.
  return <ProviderCardList key={module.id} module={module} config={config} />;
}

export default function PaymentMethodsScreen(): React.JSX.Element {
  const { t } = useTranslation();

  // Keep card details out of screenshots and the app switcher snapshot.
  usePreventScreenCapture();

  return (
    <Screen scroll>
      <BackButton />
      <Text variant="h1" className="mb-4">
        {t('payments.title')}
      </Text>
      <PaymentMethodsBody />
    </Screen>
  );
}
