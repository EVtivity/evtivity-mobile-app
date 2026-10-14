// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable, ScrollView, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Trash2, Car, Lock } from '@/components/icons';
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
  useApiErrorToast,
  useConfirm,
} from '@/components/ui';
import { hsl } from '@/lib/theme';
import { formatDateTime } from '@/lib/format';
import { autochargeControl, formatVehicleId } from '@/lib/vehicle-id';
import type { Vehicle } from '@/lib/types';
import {
  useVehicles,
  useAddVehicle,
  useDeleteVehicle,
  useVehicleLookup,
  useSetVehicleAutocharge,
} from '@/features/account';
import { useFeatures } from '@/features/app-info';

function IdRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View className="flex-row gap-2">
      <Text variant="small" className="text-muted-foreground">
        {label}
      </Text>
      <Text variant="small" className="flex-1">
        {value}
      </Text>
    </View>
  );
}

// The vehicle ids, where a charger last sent them, and Autocharge (charge by
// plugging in), the same as the driver portal.
function VehicleAutocharge({
  vehicle,
  label,
  offered,
  value,
  disabled,
  onToggle,
}: {
  vehicle: Vehicle;
  label: string;
  offered: boolean;
  value: boolean;
  disabled: boolean;
  onToggle: (enabled: boolean) => void;
}): React.JSX.Element | null {
  const { t } = useTranslation();
  const control = autochargeControl(vehicle, offered);
  const vin = vehicle.vin ?? null;
  const evccid = vehicle.evccid ?? null;
  const lastSeen = vehicle.lastSeen ?? null;
  if (vin == null && evccid == null) return null;
  return (
    <View className="gap-3">
      <View className="gap-1">
        {vin != null ? <IdRow label={t('vehicles.vin')} value={vin} /> : null}
        {evccid != null ? (
          <IdRow label={t('vehicles.evccid')} value={formatVehicleId(evccid)} />
        ) : null}
        {lastSeen != null ? (
          <View className="flex-row gap-2" testID={`vehicle-last-seen-${vehicle.id}`}>
            <Text variant="small" className="text-muted-foreground">
              {t('vehicles.lastSeen')}
            </Text>
            <Text variant="small" className="flex-1">
              {t('vehicles.lastSeenValue', {
                station: lastSeen.stationId,
                time: formatDateTime(lastSeen.at),
              })}
            </Text>
          </View>
        ) : null}
      </View>
      {control !== 'none' ? (
        <View className="flex-row items-center gap-3 rounded-xl border border-border p-3">
          <View className="flex-1 gap-0.5">
            <Text weight="semibold" className="text-sm">
              {t('vehicles.autocharge')}
            </Text>
            <Text
              variant="small"
              testID={control === 'locked' ? `vehicle-autocharge-blocked-${vehicle.id}` : undefined}
              className={control === 'locked' ? 'text-destructive' : 'text-muted-foreground'}
            >
              {t(control === 'locked' ? 'vehicles.autochargeBlocked' : 'vehicles.autochargeHelp')}
            </Text>
          </View>
          {control === 'locked' ? (
            // Only the operator can unblock it: no switch, a lock instead.
            <View
              testID={`vehicle-autocharge-locked-${vehicle.id}`}
              accessibilityLabel={t('vehicles.autochargeBlocked')}
            >
              <Lock size={20} color={hsl('mutedForeground')} />
            </View>
          ) : (
            <Switch
              testID={`vehicle-autocharge-${vehicle.id}`}
              accessibilityLabel={t('vehicles.autochargeFor', { vehicle: label })}
              value={value}
              disabled={disabled}
              onValueChange={onToggle}
              trackColor={{ true: hsl('primary'), false: hsl('muted') }}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

export default function VehiclesScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const toast = useToast();
  const showApiError = useApiErrorToast();
  const confirm = useConfirm();

  const vehicles = useVehicles();
  const lookup = useVehicleLookup();
  const addVehicle = useAddVehicle();
  const deleteVehicle = useDeleteVehicle();
  const setAutocharge = useSetVehicleAutocharge();
  const features = useFeatures();
  const autochargeOffered = features.data?.autochargeEnabled === true;
  // Per-vehicle optimistic Autocharge state, so the controlled Switch shows the
  // driver's toggle at once instead of snapping back during the round trip.
  const [pendingAutocharge, setPendingAutocharge] = React.useState<Record<string, boolean>>({});

  const [open, setOpen] = React.useState(false);
  const [make, setMake] = React.useState('');
  const [model, setModel] = React.useState('');
  const [year, setYear] = React.useState('');

  const makes = lookup.data?.makes ?? [];
  const models = (lookup.data?.models ?? []).filter((m) => m.make === make).map((m) => m.model);

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
      toast.show(t('account.vehicleAdded'), 'success');
    } catch (err) {
      showApiError(err);
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
      onSuccess: () => toast.show(t('account.vehicleRemoved'), 'success'),
      onError: (err) => showApiError(err),
    });
  };

  const onToggleAutocharge = (id: string, enabled: boolean): void => {
    setPendingAutocharge((m) => ({ ...m, [id]: enabled }));
    const clear = (): void =>
      setPendingAutocharge((m) => {
        const next = { ...m };
        delete next[id];
        return next;
      });
    setAutocharge.mutate(
      { id, enabled },
      {
        onSuccess: clear,
        onError: (err) => {
          clear();
          showApiError(err);
        },
      },
    );
  };

  const items = vehicles.data ?? [];

  return (
    <Screen scroll>
      <BackButton />
      <Text variant="h1" className="mb-4">
        {t('account.vehicles')}
      </Text>

      <AddButton
        testID="vehicle-add"
        title={t('account.addVehicle')}
        onPress={() => setOpen(true)}
      />

      {vehicles.isLoading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Car size={40} color={hsl('mutedForeground')} />}
          title={t('account.noVehicles')}
        />
      ) : (
        <View className="gap-3">
          {items.map((v) => {
            const label = [v.make, v.model].filter(Boolean).join(' ') || t('common.na');
            return (
              <ListItemCard
                key={v.id}
                testID={`vehicle-${v.id}`}
                title={label}
                subtitle={v.year ?? undefined}
                footer={
                  <VehicleAutocharge
                    vehicle={v}
                    label={label}
                    offered={autochargeOffered}
                    value={pendingAutocharge[v.id] ?? v.autochargeEnabled === true}
                    disabled={pendingAutocharge[v.id] != null}
                    onToggle={(enabled) => onToggleAutocharge(v.id, enabled)}
                  />
                }
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
