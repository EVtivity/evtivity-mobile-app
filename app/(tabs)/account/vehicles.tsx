// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Trash2, Car } from '@/components/icons';
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
  ChipGroup,
  ListItemCard,
  useToast,
  useConfirm,
} from '@/components/ui';
import { hsl } from '@/lib/theme';
import { apiErrorMessage } from '@/lib/api';
import { useVehicles, useAddVehicle, useDeleteVehicle, useVehicleLookup } from '@/features/account';

export default function VehiclesScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();

  const vehicles = useVehicles();
  const lookup = useVehicleLookup();
  const addVehicle = useAddVehicle();
  const deleteVehicle = useDeleteVehicle();

  const [open, setOpen] = React.useState(false);
  const [make, setMake] = React.useState('');
  const [model, setModel] = React.useState('');
  const [year, setYear] = React.useState('');

  const makes = lookup.data?.makes ?? [];
  const models = (lookup.data?.models ?? [])
    .filter((m) => m.make === make)
    .map((m) => m.model);

  const onAdd = async (): Promise<void> => {
    try {
      await addVehicle.mutateAsync({
        make: make.trim(),
        model: model.trim(),
        ...(year.trim().length > 0 ? { year: year.trim() } : {}),
      });
      setMake('');
      setModel('');
      setYear('');
      setOpen(false);
      toast.show(t('account.addVehicle'), 'success');
    } catch (err) {
      toast.show(
        apiErrorMessage(err, t),
        'error',
      );
    }
  };

  const onDelete = async (id: string, label: string): Promise<void> => {
    const ok = await confirm({
      title: t('account.removeVehicleTitle'),
      message: t('account.removeVehicleMessage', { vehicle: label }),
      confirmText: t('common.remove'),
      destructive: true,
    });
    if (!ok) return;
    deleteVehicle.mutate(id, {
      onSuccess: () => toast.show(t('common.remove'), 'success'),
      onError: (err) =>
        toast.show(apiErrorMessage(err, t), 'error'),
    });
  };

  const items = vehicles.data ?? [];

  return (
    <Screen scroll>
      <BackButton />
      <Text variant="h1" className="mb-4">
        {t('account.vehicles')}
      </Text>

      <AddButton testID="vehicle-add" title={t('account.addVehicle')} onPress={() => setOpen(true)} />

      {vehicles.isLoading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState icon={<Car size={40} color={hsl('mutedForeground')} />} title={t('account.noVehicles')} />
      ) : (
        <View className="gap-3">
          {items.map((v) => {
            const label = [v.make, v.model].filter(Boolean).join(' ') || t('common.na');
            return (
              <ListItemCard
                key={v.id}
                title={label}
                subtitle={v.year ?? undefined}
                right={
                  <Pressable
                    testID={`vehicle-delete-${v.id}`}
                    accessibilityLabel={t('common.remove')}
                    hitSlop={8}
                    onPress={() => void onDelete(v.id, label)}
                  >
                    <Trash2 size={20} color={hsl('destructive')} />
                  </Pressable>
                }
              />
            );
          })}
        </View>
      )}

      <Sheet visible={open} onClose={() => setOpen(false)} title={t('account.addVehicle')}>
        <ScrollView keyboardShouldPersistTaps="handled" className="max-h-[440px]">
          <View className="gap-4">
            <ChipGroup
              label={t('account.make')}
              options={makes.map((m) => ({ value: m, label: m }))}
              value={make}
              onSelect={(m) => {
                setMake(m);
                setModel('');
              }}
              emptyHint={t('common.loading')}
            />
            {make !== '' ? (
              <ChipGroup
                label={t('account.model')}
                options={models.map((m) => ({ value: m, label: m }))}
                value={model}
                onSelect={setModel}
              />
            ) : null}
            <Field
              testID="vehicle-year"
              label={t('account.year')}
              value={year}
              onChangeText={setYear}
              keyboardType="number-pad"
              maxLength={4}
            />
            <Button
              testID="vehicle-submit"
              title={t('common.add')}
              loading={addVehicle.isPending}
              disabled={make.trim().length === 0 || model.trim().length === 0}
              onPress={() => void onAdd()}
            />
          </View>
        </ScrollView>
      </Sheet>
    </Screen>
  );
}
