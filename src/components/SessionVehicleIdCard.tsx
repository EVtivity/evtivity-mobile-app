// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Car, PlugZap } from '@/components/icons';
import { Badge, Button, Card, ChipGroup, Field, Sheet, Text, useToast } from '@/components/ui';
import { apiErrorMessage } from '@/lib/api';
import { hsl } from '@/lib/theme';
import {
  canUseForPlugIn,
  formatVehicleId,
  type VehicleCapture,
  type VehicleIds,
} from '@/lib/vehicle-id';
import { useVehicles } from '@/features/account';
import { useClaimSessionVehicle } from '@/features/sessions';
import type { Vehicle } from '@/lib/types';

const NEW_VEHICLE = '__new__';

function vehicleName(v: Vehicle): string {
  return [v.year, v.make, v.model].filter((p) => p != null && p !== '').join(' ') || v.id;
}

/**
 * The vehicle id the charger sent for this session (Autocharge), with "Use
 * This Vehicle for Plug-In Charging" where the session's site offers
 * Autocharge and the session's vehicle does not already charge by plugging in
 * with this id. The same card as the driver portal.
 */
export function SessionVehicleIdCard({
  sessionId,
  capture,
  autocharge,
  autochargeAvailable,
  vehicle,
}: {
  sessionId: string;
  capture: VehicleCapture;
  autocharge: boolean;
  autochargeAvailable: boolean;
  vehicle: (VehicleIds & { id: string }) | null;
}): React.JSX.Element {
  const { t } = useTranslation();
  const toast = useToast();
  const vehicles = useVehicles();
  const claim = useClaimSessionVehicle(sessionId);
  const [open, setOpen] = React.useState(false);
  const [target, setTarget] = React.useState<string | null>(null);
  const [make, setMake] = React.useState('');
  const [model, setModel] = React.useState('');
  const [enableAutocharge, setEnableAutocharge] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const list = vehicles.data ?? [];
  const selected = target ?? vehicle?.id ?? list[0]?.id ?? NEW_VEHICLE;
  const shownId = formatVehicleId(capture.value);

  const onSave = (): void => {
    if (selected === NEW_VEHICLE && (make.trim() === '' || model.trim() === '')) {
      setError(t('vehicles.makeModelRequired'));
      return;
    }
    setError(null);
    claim.mutate(
      selected === NEW_VEHICLE
        ? { vehicle: { make: make.trim(), model: model.trim() }, enableAutocharge }
        : { vehicleId: selected, enableAutocharge },
      {
        onSuccess: () => {
          setOpen(false);
          toast.show(t('vehicles.autochargeSaved'), 'success');
        },
        onError: (err) => setError(apiErrorMessage(err, t)),
      },
    );
  };

  return (
    <Card className="gap-3" testID="session-vehicle-id-card">
      <View className="flex-row items-center gap-2">
        <Car size={18} color={hsl('mutedForeground')} />
        <Text weight="semibold" className="text-sm text-muted-foreground">
          {t('vehicles.vehicleId')}
        </Text>
        {autocharge ? (
          <Badge testID="session-autocharge" label={t('vehicles.autocharge')} variant="info" />
        ) : null}
      </View>
      <View>
        <Text testID="session-vehicle-id">
          {shownId} ({t(`vehicles.idTypes.${capture.type}`, { defaultValue: capture.type })})
        </Text>
        <Text variant="caption">{t('vehicles.capturedFromCharger')}</Text>
      </View>
      {canUseForPlugIn(capture, vehicle, autochargeAvailable) ? (
        <Button
          testID="session-use-for-plug-in"
          title={t('vehicles.useForPlugIn')}
          leftIcon={<PlugZap size={18} />}
          onPress={() => {
            setError(null);
            setOpen(true);
          }}
        />
      ) : null}

      <Sheet
        visible={open}
        onClose={() => {
          if (!claim.isPending) setOpen(false);
        }}
        title={t('vehicles.useForPlugIn')}
      >
        <View className="gap-4">
          <Text variant="muted">{t('vehicles.useForPlugInDescription', { id: shownId })}</Text>
          <ChipGroup
            label={t('vehicles.vehicle')}
            options={[
              ...list.map((v) => ({ value: v.id, label: vehicleName(v) })),
              { value: NEW_VEHICLE, label: t('vehicles.newVehicle') },
            ]}
            value={selected}
            onSelect={(v) => {
              setTarget(v);
              setError(null);
            }}
          />
          {selected === NEW_VEHICLE ? (
            <View className="gap-3">
              <Field
                testID="claim-make"
                label={t('account.make')}
                value={make}
                onChangeText={setMake}
              />
              <Field
                testID="claim-model"
                label={t('account.model')}
                value={model}
                onChangeText={setModel}
              />
            </View>
          ) : null}
          <View className="flex-row items-center gap-3 rounded-xl border border-border p-3">
            <View className="flex-1 gap-0.5">
              <Text weight="semibold" className="text-sm">
                {t('vehicles.autocharge')}
              </Text>
              <Text variant="small" className="text-muted-foreground">
                {t('vehicles.autochargeHelp')}
              </Text>
            </View>
            <Switch
              testID="claim-autocharge"
              accessibilityLabel={t('vehicles.autocharge')}
              value={enableAutocharge}
              onValueChange={setEnableAutocharge}
              trackColor={{ true: hsl('primary'), false: hsl('muted') }}
            />
          </View>
          {error != null ? (
            <Text testID="claim-error" accessibilityRole="alert" className="text-destructive">
              {error}
            </Text>
          ) : null}
          <Button
            testID="claim-submit"
            title={t('common.save')}
            loading={claim.isPending}
            onPress={onSave}
          />
        </View>
      </Sheet>
    </Card>
  );
}
