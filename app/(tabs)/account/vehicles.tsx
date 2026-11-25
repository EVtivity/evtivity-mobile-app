// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable, ScrollView, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Trash2, Car, Lock, Pencil } from '@/components/icons';
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
  useUpdateVehicleAppearance,
} from '@/features/account';
import {
  VEHICLE_BODY_TYPES,
  VEHICLE_COLORS,
  isVehicleBodyType,
  isVehicleColor,
} from '@/lib/vehicle-appearance';
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

interface Appearance {
  color: string;
  bodyType: string;
}

// The color and body type as chips; the first chip of each is Not Set ('').
function AppearanceChips({
  value,
  onChange,
}: {
  value: Appearance;
  onChange: (next: Appearance) => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  const notSet = { value: '', label: t('vehicles.notSet') };
  return (
    <>
      <ChipGroup
        label={t('vehicles.color')}
        options={[
          notSet,
          ...VEHICLE_COLORS.map((c) => ({ value: c, label: t(`vehicles.colors.${c}`) })),
        ]}
        value={value.color}
        onSelect={(color) => onChange({ ...value, color })}
      />
      <ChipGroup
        label={t('vehicles.bodyType')}
        options={[
          notSet,
          ...VEHICLE_BODY_TYPES.map((b) => ({ value: b, label: t(`vehicles.bodyTypes.${b}`) })),
        ]}
        value={value.bodyType}
        onSelect={(bodyType) => onChange({ ...value, bodyType })}
      />
    </>
  );
}

/** The year, color and body type of a vehicle card, or undefined when none is set. */
function vehicleSubtitle(v: Vehicle, t: (key: string) => string): string | undefined {
  const parts = [
    v.year ?? null,
    isVehicleColor(v.color) ? t(`vehicles.colors.${v.color}`) : null,
    isVehicleBodyType(v.bodyType) ? t(`vehicles.bodyTypes.${v.bodyType}`) : null,
  ].filter((p): p is string => p != null && p !== '');
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

const NO_APPEARANCE: Appearance = { color: '', bodyType: '' };

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
  const updateAppearance = useUpdateVehicleAppearance();
  const features = useFeatures();
  const autochargeOffered = features.data?.autochargeEnabled === true;
  // Per-vehicle optimistic Autocharge state, so the controlled Switch shows the
  // driver's toggle at once instead of snapping back during the round trip.
  const [pendingAutocharge, setPendingAutocharge] = React.useState<Record<string, boolean>>({});

  const [open, setOpen] = React.useState(false);
  const [make, setMake] = React.useState('');
  const [model, setModel] = React.useState('');
  const [year, setYear] = React.useState('');
  const [appearance, setAppearance] = React.useState<Appearance>(NO_APPEARANCE);
  // The vehicle whose color and body type are being edited.
  const [editing, setEditing] = React.useState<{ id: string; label: string } | null>(null);
  const [editAppearance, setEditAppearance] = React.useState<Appearance>(NO_APPEARANCE);

  const makes = lookup.data?.makes ?? [];
  const models = (lookup.data?.models ?? []).filter((m) => m.make === make).map((m) => m.model);

  const onAdd = async (): Promise<void> => {
    try {
      await addVehicle.mutateAsync({
        make: make.trim(),
        model: model.trim(),
        ...(year.trim().length > 0 ? { year: year.trim() } : {}),
        ...(appearance.color !== '' ? { color: appearance.color } : {}),
        ...(appearance.bodyType !== '' ? { bodyType: appearance.bodyType } : {}),
      });
      setMake('');
      setModel('');
      setYear('');
      setAppearance(NO_APPEARANCE);
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

  const onEdit = (v: Vehicle, label: string): void => {
    setEditAppearance({
      color: isVehicleColor(v.color) ? v.color : '',
      bodyType: isVehicleBodyType(v.bodyType) ? v.bodyType : '',
    });
    setEditing({ id: v.id, label });
  };

  const onSaveAppearance = async (): Promise<void> => {
    if (editing == null) return;
    try {
      await updateAppearance.mutateAsync({
        id: editing.id,
        color: editAppearance.color === '' ? null : editAppearance.color,
        bodyType: editAppearance.bodyType === '' ? null : editAppearance.bodyType,
      });
      setEditing(null);
      toast.show(t('account.vehicleSaved'), 'success');
    } catch (err) {
      showApiError(err);
    }
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
                subtitle={vehicleSubtitle(v, t)}
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
                  <View className="flex-row items-center gap-4">
                    <Pressable
                      testID={`vehicle-edit-${v.id}`}
                      accessibilityLabel={t('account.editVehicle')}
                      hitSlop={8}
                      onPress={() => onEdit(v, label)}
                    >
                      <Pencil size={20} color={hsl('mutedForeground')} />
                    </Pressable>
                    <Pressable
                      testID={`vehicle-delete-${v.id}`}
                      accessibilityLabel={t('common.remove')}
                      hitSlop={8}
                      onPress={() => void onDelete(v.id, label)}
                    >
                      <Trash2 size={20} color={hsl('destructive')} />
                    </Pressable>
                  </View>
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
            <AppearanceChips value={appearance} onChange={setAppearance} />
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

      <Sheet
        visible={editing != null}
        onClose={() => setEditing(null)}
        title={editing?.label ?? t('account.editVehicle')}
      >
        <ScrollView keyboardShouldPersistTaps="handled" className="max-h-[440px]">
          <View className="gap-4">
            <AppearanceChips value={editAppearance} onChange={setEditAppearance} />
            <Button
              testID="vehicle-appearance-save"
              title={t('common.save')}
              loading={updateAppearance.isPending}
              onPress={() => void onSaveAppearance()}
            />
          </View>
        </ScrollView>
      </Sheet>
    </Screen>
  );
}
