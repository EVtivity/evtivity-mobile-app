// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen, Text, Field, Button, Card, Spinner, BackButton, useToast } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { ApiError, getApiErrorFieldDetails } from '@/lib/api';
import { isMemberBilled } from '@/lib/fleet-billing';
import {
  BILLING_ADDRESS_FIELDS,
  isBillingAddressEmpty,
  toBillingAddressBody,
  toBillingAddressForm,
  type BillingAddressForm,
  type DriverBillingAddress,
} from '@/lib/billing-address';
import { useDriverBillingAddress, useUpdateBillingAddress } from '@/features/account';

// The form, mounted once the stored address has loaded so it starts from it.
function AddressForm({
  address,
}: {
  address: DriverBillingAddress | undefined;
}): React.JSX.Element {
  const { t } = useTranslation();
  const toast = useToast();
  const driver = useAuth((s) => s.driver);
  const update = useUpdateBillingAddress();

  const [form, setForm] = React.useState<BillingAddressForm>(() => toBillingAddressForm(address));
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const onSave = async (): Promise<void> => {
    setFieldErrors({});
    try {
      await update.mutateAsync(toBillingAddressBody(form));
      toast.show(t('billingAddress.updated'), 'success');
    } catch (err) {
      if (err instanceof ApiError) setFieldErrors(getApiErrorFieldDetails(err));
      toast.show(
        err instanceof ApiError && !err.isServerDown
          ? t('billingAddress.updateFailed')
          : t('common.offline'),
        'error',
      );
    }
  };

  const fullName = `${driver?.firstName ?? ''} ${driver?.lastName ?? ''}`.trim();

  return (
    <View className="gap-4">
      {BILLING_ADDRESS_FIELDS.map(({ key, label, maxLength, autoComplete }) => (
        <Field
          key={key}
          testID={`billing-address-${key}`}
          label={t(`billingAddress.${label}`)}
          value={form[key]}
          onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
          maxLength={maxLength}
          autoComplete={autoComplete}
          autoCapitalize="words"
          error={fieldErrors[key]}
          {...(key === 'billingName'
            ? {
                helper: t('billingAddress.nameHelp'),
                ...(fullName !== '' ? { placeholder: fullName } : {}),
              }
            : {})}
        />
      ))}
      <Button
        testID="billing-address-save"
        title={t('common.save')}
        loading={update.isPending}
        onPress={() => void onSave()}
      />
    </View>
  );
}

// The bill-to block of the member invoices a fleet addresses to the driver
// (PATCH /v1/portal/driver/billing-address). A blank field clears it.
export default function BillingAddressScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const { address, billing, isLoading } = useDriverBillingAddress();
  const showNudge = isMemberBilled(billing) && isBillingAddressEmpty(address);

  return (
    <Screen scroll>
      <BackButton />
      <Text variant="h1" className="mb-1">
        {t('billingAddress.title')}
      </Text>
      <Text variant="muted" className="mb-4">
        {t('billingAddress.description')}
      </Text>

      {showNudge ? (
        <Card testID="billing-address-nudge" flat>
          <Text className="text-sm text-muted-foreground">{t('billingAddress.nudge')}</Text>
        </Card>
      ) : null}

      {isLoading ? <Spinner /> : <AddressForm address={address} />}
    </Screen>
  );
}
