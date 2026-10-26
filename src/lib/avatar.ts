// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import { Avatar, OptionsDescriptor, Style } from '@dicebear/core';
import avataaars from '@dicebear/styles/avataaars.json';

// Driver avatars: a DiceBear Avataaars avatar built from allow-listed options,
// or an uploaded image. The API checks the same allow-list
// (GET /v1/portal/driver/avatar, PUT for a generated one); this file builds the
// pickers, the Random button and the SVG the app renders on the device.

/** The avatar as the API returns it. */
export type DriverAvatar =
  | {
      kind: 'generated';
      style: 'avataaars';
      seed: string;
      options: Record<string, string | number>;
      updatedAt?: string | null;
    }
  | {
      kind: 'image';
      url: string | null;
      expiresAt?: string | null;
      updatedAt?: string | null;
    };

export interface GeneratedAvatar {
  style: 'avataaars';
  seed: string;
  options: Record<string, string | number>;
}

export type AvatarChoiceKind = 'enum' | 'color' | 'toggle';

export interface AvatarOptionChoice {
  key: string;
  kind: AvatarChoiceKind;
  values: string[];
}

/** Uploads must be smaller than 1 MB, checked before any request (the server checks again). */
export const AVATAR_MAX_BYTES = 1024 * 1024 - 1;
export const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const VARIANT_COMPONENTS = [
  'top',
  'accessories',
  'eyebrows',
  'eyes',
  'mouth',
  'facialHair',
  'clothes',
  'clothesGraphic',
] as const;
const TOGGLE_COMPONENTS = ['top', 'accessories', 'facialHair'] as const;
const COLOR_PALETTES: Record<string, readonly string[]> = {
  skinColor: avataaars.colors.skin.values,
  hairColor: avataaars.colors.hair.values,
  facialHairColor: avataaars.colors.facialHair.values,
  clothesColor: avataaars.colors.clothes.values,
  hatColor: avataaars.colors.hat.values,
  accessoriesColor: avataaars.colors.accessories.values,
};
const BACKGROUND_CHOICES = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf', 'e5e7eb'];
const FLIP_VALUES = ['none', 'horizontal'];

let cachedStyle: Style | null = null;
function avatarStyle(): Style {
  cachedStyle ??= new Style<unknown>(avataaars);
  return cachedStyle;
}

/** The values of an enum field of the options descriptor; none for any other field. */
export function enumValuesOf(field: { type: string; values?: readonly string[] } | undefined) {
  return field?.type === 'enum' && field.values != null ? [...field.values] : [];
}

let cachedChoices: AvatarOptionChoice[] | null = null;

/** Every option the pickers offer, read from the style's options descriptor once. */
export function avatarOptionChoices(): AvatarOptionChoice[] {
  if (cachedChoices == null) {
    const descriptor = new OptionsDescriptor(avatarStyle()).toJSON();
    const choices: AvatarOptionChoice[] = [];
    for (const component of VARIANT_COMPONENTS) {
      choices.push({
        key: `${component}Variant`,
        kind: 'enum',
        values: enumValuesOf(descriptor[`${component}Variant`]),
      });
    }
    for (const component of TOGGLE_COMPONENTS) {
      choices.push({ key: `${component}Probability`, kind: 'toggle', values: [] });
    }
    for (const [key, palette] of Object.entries(COLOR_PALETTES)) {
      choices.push({ key, kind: 'color', values: palette.map((c) => c.replace('#', '')) });
    }
    choices.push({ key: 'backgroundColor', kind: 'color', values: [...BACKGROUND_CHOICES] });
    choices.push({ key: 'flip', kind: 'enum', values: [...FLIP_VALUES] });
    cachedChoices = choices;
  }
  return cachedChoices.map((c) => ({ ...c, values: [...c.values] }));
}

/** The SVG markup of a generated avatar, for `SvgXml`. Colors get their `#`. */
export function renderGeneratedAvatarSvg(avatar: GeneratedAvatar): string {
  const options: Record<string, unknown> = { seed: avatar.seed };
  for (const [key, value] of Object.entries(avatar.options)) {
    options[key] = typeof value === 'string' && key.endsWith('Color') ? `#${value}` : value;
  }
  return new Avatar(avatarStyle(), options).toString();
}

const SEED_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** One of `values` by the random source; empty text for no values. */
export function pickValue(values: readonly string[], random: () => number): string {
  return values[Math.floor(random() * values.length) % values.length] ?? '';
}

/** A random avatar with every option set, as the Random button makes. */
export function randomGeneratedAvatar(random: () => number = Math.random): GeneratedAvatar {
  let seed = '';
  for (let i = 0; i < 16; i++) {
    seed += SEED_ALPHABET.charAt(Math.floor(random() * SEED_ALPHABET.length));
  }
  const options: Record<string, string | number> = {};
  for (const choice of avatarOptionChoices()) {
    if (choice.key === 'flip') {
      options[choice.key] = 'none';
    } else if (choice.kind === 'toggle') {
      const shown =
        choice.key === 'topProbability'
          ? 0.95
          : choice.key === 'accessoriesProbability'
            ? 0.3
            : 0.2;
      options[choice.key] = random() < shown ? 100 : 0;
    } else {
      options[choice.key] = pickValue(choice.values, random);
    }
  }
  return { style: 'avataaars', seed, options };
}

/**
 * The translation key of why a picked image cannot be uploaded, or null. The
 * picker may not know the size (`fileSize` undefined): the caller reads it from
 * the file and passes it.
 */
export function avatarFileProblem(file: { size: number; mimeType: string | null | undefined }) {
  if (file.mimeType == null || !(AVATAR_MIME_TYPES as readonly string[]).includes(file.mimeType)) {
    return 'account.avatarWrongType';
  }
  if (file.size > AVATAR_MAX_BYTES) return 'account.avatarTooLarge';
  return null;
}

/** `shortFlat` -> `Short Flat`, `prescription01` -> `Prescription 01`. */
export function humanizeAvatarValue(value: string): string {
  const spaced = value.replace(/([a-z])([A-Z0-9])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Up to two initials of a name, for a driver without an avatar. */
export function initialsOf(firstName?: string | null, lastName?: string | null): string {
  return [firstName, lastName]
    .map((part) => (part ?? '').trim().charAt(0))
    .join('')
    .toUpperCase();
}
