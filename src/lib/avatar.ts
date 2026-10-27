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

const AVATAR_SEED_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const AVATAR_OPTIONS_MAX_JSON = 4096;
const HEX_COLOR = /^[0-9a-f]{6}$/;

/**
 * Why `input` is not a generated avatar on the allow-list, or null when it is.
 * The same rules as the API (`@evtivity/lib/driver-avatar`
 * `generatedAvatarProblem`): known fields and options only, values from the
 * style, colors as six lowercase hex digits, 0 or 100 toggles, at most 4096
 * characters of JSON.
 */
export function generatedAvatarProblem(input: unknown): string | null {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) {
    return 'The avatar must be an object';
  }
  const record = input as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key !== 'style' && key !== 'seed' && key !== 'options') {
      return `Unknown avatar field ${key}`;
    }
  }
  if (record['style'] !== 'avataaars') return 'The avatar style must be avataaars';
  const seed = record['seed'];
  if (typeof seed !== 'string' || !AVATAR_SEED_PATTERN.test(seed)) return 'Invalid seed';
  const options = record['options'];
  if (options == null || typeof options !== 'object' || Array.isArray(options)) {
    return 'The avatar options must be an object';
  }
  if (JSON.stringify(input).length > AVATAR_OPTIONS_MAX_JSON) return 'The avatar is too large';
  const choices = new Map(avatarOptionChoices().map((c) => [c.key, c]));
  for (const [key, value] of Object.entries(options as Record<string, unknown>)) {
    const choice = choices.get(key);
    if (choice == null) return `Unknown avatar option ${key}`;
    if (choice.kind === 'toggle') {
      if (value !== 0 && value !== 100) return `${key} must be 0 or 100`;
      continue;
    }
    if (typeof value !== 'string') return `${key} must be a string`;
    if (choice.kind === 'color') {
      if (!HEX_COLOR.test(value)) return `${key} must be six lowercase hex digits`;
      if (key !== 'backgroundColor' && !choice.values.includes(value)) {
        return `${key} is not one of the style colors`;
      }
      continue;
    }
    if (!choice.values.includes(value)) return `${key} has an unknown value`;
  }
  return null;
}

/**
 * The SVG of a generated avatar the app received, or null when it is not on
 * the allow-list or does not render: the app then shows initials.
 */
export function checkedGeneratedAvatarSvg(input: unknown): string | null {
  if (generatedAvatarProblem(input) != null) return null;
  try {
    return renderGeneratedAvatarSvg(input as GeneratedAvatar);
  } catch {
    return null;
  }
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

/**
 * The chip value meaning "leave this component out" (No Hair or Headwear, No
 * Glasses, No Facial Hair). It is never stored: it maps to the component's
 * probability 0. No variant of an optional component has this name. Mirrors
 * the CSMS shared rules.
 */
export const AVATAR_NONE_VALUE = 'none';

/** Variant options whose chips offer None, and the probability each one maps to. */
const OPTIONAL_VARIANTS: Readonly<Record<string, string>> = {
  topVariant: 'topProbability',
  accessoriesVariant: 'accessoriesProbability',
  facialHairVariant: 'facialHairProbability',
};

/** Color options that apply only while their component is shown. */
const COLOR_COMPONENT: Readonly<Record<string, string>> = {
  hairColor: 'topVariant',
  hatColor: 'topVariant',
  accessoriesColor: 'accessoriesVariant',
  facialHairColor: 'facialHairVariant',
};

/** True when the chips of `variantKey` offer None as their first option. */
export function avatarVariantHasNone(variantKey: string): boolean {
  return Object.prototype.hasOwnProperty.call(OPTIONAL_VARIANTS, variantKey);
}

/**
 * The selected value of a variant option: `AVATAR_NONE_VALUE` while the
 * component's probability is 0, else the stored variant ('' when unset).
 */
export function avatarVariantSelection(
  options: Readonly<Record<string, string | number>>,
  variantKey: string,
): string {
  const probabilityKey = OPTIONAL_VARIANTS[variantKey];
  if (probabilityKey !== undefined && options[probabilityKey] === 0) return AVATAR_NONE_VALUE;
  const value = options[variantKey];
  return typeof value === 'string' ? value : '';
}

/**
 * The options after a pick. None stores the probability 0 and keeps the
 * stored variant; a variant of an optional component stores it with the
 * probability 100; any other option stores the value as picked.
 */
export function withAvatarVariantSelection(
  options: Readonly<Record<string, string | number>>,
  variantKey: string,
  value: string,
): Record<string, string | number> {
  const probabilityKey = OPTIONAL_VARIANTS[variantKey];
  if (probabilityKey === undefined) return { ...options, [variantKey]: value };
  if (value === AVATAR_NONE_VALUE) return { ...options, [probabilityKey]: 0 };
  return { ...options, [variantKey]: value, [probabilityKey]: 100 };
}

/** False for a color whose component is set to None: its picker hides then. */
export function avatarColorShown(
  options: Readonly<Record<string, string | number>>,
  colorKey: string,
): boolean {
  const variantKey = COLOR_COMPONENT[colorKey];
  return (
    variantKey === undefined || avatarVariantSelection(options, variantKey) !== AVATAR_NONE_VALUE
  );
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
