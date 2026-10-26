// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import React from 'react';
import { View, Pressable, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import {
  Screen,
  Text,
  Button,
  BackButton,
  Segmented,
  ChipGroup,
  useToast,
  useApiErrorToast,
  useConfirm,
} from '@/components/ui';
import { DriverAvatar } from '@/components/DriverAvatar';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import {
  avatarFileProblem,
  avatarOptionChoices,
  humanizeAvatarValue,
  randomGeneratedAvatar,
  type GeneratedAvatar,
} from '@/lib/avatar';
import { useDriverAvatar, useRemoveAvatar, useSetAvatar, useUploadAvatar } from '@/features/avatar';
import { useFeatures } from '@/features/app-info';

// Build an avatar (pickers, Random, Save), upload one from the photo library
// (smaller than 1 MB, cropped to a square), or remove it.
export default function AvatarScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const toast = useToast();
  const showApiError = useApiErrorToast();
  const confirm = useConfirm();
  const driver = useAuth((s) => s.driver);
  const current = useDriverAvatar();
  const { data: features } = useFeatures();
  const uploadEnabled = features?.avatarUploadEnabled === true;
  const setAvatar = useSetAvatar();
  const uploadAvatar = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();
  const busy = setAvatar.isPending || uploadAvatar.isPending || removeAvatar.isPending;

  const [mode, setMode] = React.useState<'create' | 'upload'>('create');
  // The driver's edits; before any, the saved generated avatar, else a random one.
  const [edited, setEdited] = React.useState<GeneratedAvatar | null>(null);
  const [fallback] = React.useState(() => randomGeneratedAvatar());
  const choices = React.useMemo(() => avatarOptionChoices(), []);
  const saved = current.data;
  const draft: GeneratedAvatar | null =
    edited ??
    (saved?.kind === 'generated'
      ? { style: 'avataaars', seed: saved.seed, options: saved.options }
      : current.isLoading
        ? null
        : fallback);

  const setOption = (key: string, value: string | number): void => {
    if (draft != null) setEdited({ ...draft, options: { ...draft.options, [key]: value } });
  };

  const onSave = (): void => {
    if (draft == null) return;
    setAvatar.mutate(draft, {
      onSuccess: () => toast.show(t('account.avatarSaved'), 'success'),
      onError: (err) => showApiError(err),
    });
  };

  const onPick = async (): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (asset == null) return;
    const size = asset.fileSize ?? new File(asset.uri).size ?? Number.MAX_SAFE_INTEGER;
    const problem = avatarFileProblem({ size, mimeType: asset.mimeType });
    if (problem != null) {
      toast.show(t(problem), 'error');
      return;
    }
    uploadAvatar.mutate(
      {
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
        fileName: asset.fileName ?? 'avatar',
        size,
      },
      {
        onSuccess: () => toast.show(t('account.avatarSaved'), 'success'),
        onError: (err) => showApiError(err),
      },
    );
  };

  const onRemove = async (): Promise<void> => {
    const ok = await confirm({
      title: t('account.avatarRemoveTitle'),
      message: t('account.avatarRemoveDescription'),
      confirmText: t('account.avatarRemove'),
      destructive: true,
    });
    if (!ok) return;
    removeAvatar.mutate(undefined, {
      onSuccess: () => toast.show(t('account.avatarRemoved'), 'success'),
      onError: (err) => showApiError(err),
    });
  };

  const preview =
    mode === 'create' && draft != null ? { kind: 'generated' as const, ...draft } : current.data;

  return (
    <Screen scroll>
      <BackButton />
      <Text variant="h1" className="mb-4">
        {t('account.avatar')}
      </Text>

      <View className="items-center gap-4 pb-2">
        <DriverAvatar
          avatar={preview}
          firstName={driver?.firstName}
          lastName={driver?.lastName}
          size={128}
        />
        {uploadEnabled ? (
          <Segmented
            segments={[
              { value: 'create', label: t('account.avatarCreate') },
              { value: 'upload', label: t('account.avatarUpload') },
            ]}
            value={mode}
            onChange={setMode}
          />
        ) : null}
      </View>

      {mode === 'create' && draft != null ? (
        <View className="gap-5">
          {choices
            .filter((c) => c.kind === 'enum')
            .map((choice) => (
              <ChipGroup
                key={choice.key}
                label={t(`account.avatarOptions.${choice.key}`)}
                options={choice.values.map((value) => ({
                  value,
                  label:
                    choice.key === 'flip'
                      ? t(`account.avatarValues.${value}`)
                      : humanizeAvatarValue(value),
                }))}
                value={String(draft.options[choice.key] ?? '')}
                onSelect={(value) => setOption(choice.key, value)}
              />
            ))}
          {choices
            .filter((c) => c.kind === 'toggle')
            .map((choice) => (
              <View key={choice.key} className="flex-row items-center justify-between">
                <Text>{t(`account.avatarOptions.${choice.key}`)}</Text>
                <Switch
                  testID={`avatar-toggle-${choice.key}`}
                  value={draft.options[choice.key] !== 0}
                  onValueChange={(on) => setOption(choice.key, on ? 100 : 0)}
                />
              </View>
            ))}
          {choices
            .filter((c) => c.kind === 'color')
            .map((choice) => (
              <View key={choice.key} className="gap-2">
                <Text variant="label">{t(`account.avatarOptions.${choice.key}`)}</Text>
                <View className="flex-row flex-wrap gap-2">
                  {choice.values.map((color) => {
                    const selected = draft.options[choice.key] === color;
                    return (
                      <Pressable
                        key={color}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`#${color}`}
                        onPress={() => setOption(choice.key, color)}
                        style={{ backgroundColor: `#${color}` }}
                        className={cn(
                          'h-9 w-9 rounded-full border border-border',
                          selected && 'border-2 border-primary',
                        )}
                      />
                    );
                  })}
                </View>
              </View>
            ))}
          <View className="flex-row gap-3">
            <Button
              testID="avatar-random"
              className="flex-1"
              variant="outline"
              title={t('account.avatarRandom')}
              disabled={busy}
              onPress={() => setEdited(randomGeneratedAvatar())}
            />
            <Button
              testID="avatar-save"
              className="flex-1"
              title={t('common.save')}
              loading={setAvatar.isPending}
              disabled={busy}
              onPress={onSave}
            />
          </View>
        </View>
      ) : null}

      {mode === 'upload' && uploadEnabled ? (
        <View className="gap-3">
          <Text variant="muted">{t('account.avatarUploadHint')}</Text>
          <Button
            testID="avatar-choose-image"
            title={t('account.avatarChooseImage')}
            loading={uploadAvatar.isPending}
            disabled={busy}
            onPress={() => void onPick()}
          />
        </View>
      ) : null}

      {current.data != null ? (
        <View className="mt-6">
          <Button
            testID="avatar-remove"
            variant="outline"
            title={t('account.avatarRemove')}
            loading={removeAvatar.isPending}
            disabled={busy}
            onPress={() => void onRemove()}
          />
        </View>
      ) : null}
    </Screen>
  );
}
