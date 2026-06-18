// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StripeProvider } from '@stripe/stripe-react-native';
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
  useConfirm,
} from '@/components/ui';
import { hsl } from '@/lib/theme';
import { ApiError, apiErrorMessage } from '@/lib/api';
import {
  fetchEphemeralKey,
  usePaymentMethods,
  useAddCard,
  useSetDefaultCard,
  useDeleteCard,
  type EphemeralKeyResponse,
  type PaymentCard,
} from '@/features/payments';

function formatBrand(brand: string | null): string {
  if (brand == null || brand.length === 0) return 'Card';
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

function CardList({ ephemeralKey }: { ephemeralKey: EphemeralKeyResponse }): React.JSX.Element {
  const { t } = useTranslation();
  const toast = useToast();

  const confirm = useConfirm();

  const methods = usePaymentMethods();
  const addCard = useAddCard(ephemeralKey);
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
      onError: (err) =>
        toast.show(
          apiErrorMessage(err, t),
          'error',
        ),
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
      toast.show(t('common.remove'), 'success');
    } catch (err) {
      toast.show(
        apiErrorMessage(err, t),
        'error',
      );
    }
  };

  const items = methods.data ?? [];

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
              title={`${formatBrand(pm.cardBrand)} •••• ${pm.cardLast4 ?? '----'}`}
              right={pm.isDefault ? <Badge label="Default" variant="success" /> : undefined}
              footer={
                <View className="flex-row gap-2">
                  {!pm.isDefault ? (
                    <Button
                      title="Set default"
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
    </>
  );
}

export default function PaymentMethodsScreen(): React.JSX.Element {
  const { t } = useTranslation();

  const [ephemeralKey, setEphemeralKey] = React.useState<EphemeralKeyResponse | null>(null);
  const [notConfigured, setNotConfigured] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const key = await fetchEphemeralKey();
        if (active) setEphemeralKey(key);
      } catch (err) {
        if (
          active &&
          err instanceof ApiError &&
          err.code === 'PAYMENT_PROVIDER_NOT_CONFIGURED'
        ) {
          setNotConfigured(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <Screen scroll>
      <BackButton />
      <Text variant="h1" className="mb-4">
        {t('payments.title')}
      </Text>

      {loading ? (
        <Spinner />
      ) : notConfigured || ephemeralKey == null ? (
        <EmptyState
          icon={<CreditCard size={40} color={hsl('mutedForeground')} />}
          title={t('payments.notConfigured')}
        />
      ) : (
        <StripeProvider publishableKey={ephemeralKey.publishableKey}>
          <CardList ephemeralKey={ephemeralKey} />
        </StripeProvider>
      )}
    </Screen>
  );
}
