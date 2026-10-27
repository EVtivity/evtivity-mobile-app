// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

import {
  AVATAR_MAX_BYTES,
  AVATAR_NONE_VALUE,
  avatarColorShown,
  avatarFileProblem,
  avatarOptionChoices,
  avatarVariantHasNone,
  avatarVariantSelection,
  withAvatarVariantSelection,
  checkedGeneratedAvatarSvg,
  enumValuesOf,
  generatedAvatarProblem,
  pickValue,
  humanizeAvatarValue,
  initialsOf,
  randomGeneratedAvatar,
  renderGeneratedAvatarSvg,
} from '../avatar';

/** A deterministic random source (mulberry32). */
function seeded(start: number): () => number {
  let a = start;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('avatarOptionChoices', () => {
  it('lists variants, toggles, palettes, background and flip from the style', () => {
    const choices = avatarOptionChoices();
    const top = choices.find((c) => c.key === 'topVariant');
    expect(top?.kind).toBe('enum');
    expect(top?.values).toContain('bob');
    expect(choices.find((c) => c.key === 'accessoriesProbability')?.kind).toBe('toggle');
    const skin = choices.find((c) => c.key === 'skinColor');
    expect(skin?.values).toContain('614335');
    expect(skin?.values.every((c) => /^[0-9a-f]{6}$/.test(c))).toBe(true);
    expect(choices.find((c) => c.key === 'flip')?.values).toEqual(['none', 'horizontal']);
    expect(choices.some((c) => c.key === 'size')).toBe(false);
  });

  it('returns a copy each time', () => {
    avatarOptionChoices()[0]?.values.push('evil');
    expect(avatarOptionChoices()[0]?.values).not.toContain('evil');
  });
});

describe('rendering on the device', () => {
  it('renders deterministic SVG markup with the chosen colors', () => {
    const avatar = {
      style: 'avataaars' as const,
      seed: 'abc',
      options: { skinColor: 'd08b5b', topVariant: 'bob', accessoriesProbability: 0 },
    };
    const svg = renderGeneratedAvatarSvg(avatar);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('#d08b5b');
    expect(renderGeneratedAvatarSvg(avatar)).toBe(svg);
  });
});

describe('allow-list (I3)', () => {
  const valid = {
    style: 'avataaars' as const,
    seed: 'abc',
    options: { topVariant: 'bob', skinColor: '614335', accessoriesProbability: 0 },
  };

  it('accepts allow-listed options and every random avatar', () => {
    expect(generatedAvatarProblem(valid)).toBeNull();
    expect(generatedAvatarProblem(randomGeneratedAvatar(seeded(7)))).toBeNull();
    expect(checkedGeneratedAvatarSvg(valid)).toBe(renderGeneratedAvatarSvg(valid));
  });

  it('refuses what the API refuses, so the app shows initials', () => {
    const bad: unknown[] = [
      null,
      [],
      { ...valid, style: 'bottts' },
      { ...valid, seed: '<script>' },
      { ...valid, extra: 1 },
      { ...valid, options: { size: 9 } },
      { ...valid, options: { topVariant: 'nope' } },
      { ...valid, options: { skinColor: '#614335' } },
      { ...valid, options: { skinColor: '000001' } },
      { ...valid, options: { backgroundColor: 'url(x)' } },
      { ...valid, options: { topProbability: 50 } },
      { ...valid, options: { flip: 'vertical' } },
      { ...valid, seed: 'a'.repeat(64), options: { topVariant: 'x'.repeat(5000) } },
    ];
    for (const input of bad) {
      expect(generatedAvatarProblem(input)).not.toBeNull();
      expect(checkedGeneratedAvatarSvg(input)).toBeNull();
    }
  });
});

describe('randomGeneratedAvatar', () => {
  it('sets every option to a listed value', () => {
    const random = seeded(7);
    const choices = avatarOptionChoices();
    for (let i = 0; i < 50; i++) {
      const avatar = randomGeneratedAvatar(random);
      expect(avatar.seed).toMatch(/^[A-Za-z0-9]{16}$/);
      for (const choice of choices) {
        const value = avatar.options[choice.key];
        if (choice.kind === 'toggle') expect([0, 100]).toContain(value);
        else expect(choice.values).toContain(value);
      }
    }
  });

  it('follows the random source and uses Math.random by default', () => {
    expect(randomGeneratedAvatar(seeded(1))).toEqual(randomGeneratedAvatar(seeded(1)));
    expect(randomGeneratedAvatar(seeded(1))).not.toEqual(randomGeneratedAvatar(seeded(2)));
    expect(randomGeneratedAvatar().style).toBe('avataaars');
  });
});

describe('avatarFileProblem', () => {
  it('accepts JPEG, PNG and WebP smaller than 1 MB only', () => {
    expect(avatarFileProblem({ size: AVATAR_MAX_BYTES, mimeType: 'image/jpeg' })).toBeNull();
    expect(avatarFileProblem({ size: 1024 * 1024, mimeType: 'image/png' })).toBe(
      'account.avatarTooLarge',
    );
    expect(avatarFileProblem({ size: 10, mimeType: 'image/gif' })).toBe('account.avatarWrongType');
    expect(avatarFileProblem({ size: 10, mimeType: null })).toBe('account.avatarWrongType');
  });
});

describe('labels', () => {
  it('humanizes value names and makes initials', () => {
    expect(humanizeAvatarValue('shortFlat')).toBe('Short Flat');
    expect(humanizeAvatarValue('prescription01')).toBe('Prescription 01');
    expect(initialsOf('ana', 'lee')).toBe('AL');
    expect(initialsOf(null, undefined)).toBe('');
    expect(initialsOf()).toBe('');
  });
});

describe('helpers', () => {
  it('reads enum values only from an enum field', () => {
    expect(enumValuesOf({ type: 'enum', values: ['a'] })).toEqual(['a']);
    expect(enumValuesOf({ type: 'color' })).toEqual([]);
    expect(enumValuesOf({ type: 'enum' })).toEqual([]);
    expect(enumValuesOf(undefined)).toEqual([]);
  });

  it('picks a value, and nothing from no values', () => {
    expect(pickValue(['a', 'b'], () => 0.6)).toBe('b');
    expect(pickValue([], () => 0.5)).toBe('');
  });
});

describe('None in the variant chips', () => {
  it('offers None for hair or headwear, glasses and facial hair only', () => {
    expect(avatarVariantHasNone('topVariant')).toBe(true);
    expect(avatarVariantHasNone('accessoriesVariant')).toBe(true);
    expect(avatarVariantHasNone('facialHairVariant')).toBe(true);
    expect(avatarVariantHasNone('eyesVariant')).toBe(false);
    expect(avatarVariantHasNone('flip')).toBe(false);
  });

  it('never collides with a variant name of an optional component', () => {
    for (const choice of avatarOptionChoices()) {
      if (avatarVariantHasNone(choice.key)) expect(choice.values).not.toContain(AVATAR_NONE_VALUE);
    }
  });

  it('shows None while the probability is 0, else the stored variant', () => {
    expect(avatarVariantSelection({ topVariant: 'bob', topProbability: 0 }, 'topVariant')).toBe(
      AVATAR_NONE_VALUE,
    );
    expect(avatarVariantSelection({ topVariant: 'bob', topProbability: 100 }, 'topVariant')).toBe(
      'bob',
    );
    expect(avatarVariantSelection({ topVariant: 'bob' }, 'topVariant')).toBe('bob');
    expect(avatarVariantSelection({}, 'accessoriesVariant')).toBe('');
    expect(avatarVariantSelection({ flip: 'none' }, 'flip')).toBe('none');
  });

  it('stores None as probability 0 and keeps the stored variant', () => {
    expect(
      withAvatarVariantSelection(
        { facialHairVariant: 'beardLight', facialHairProbability: 100 },
        'facialHairVariant',
        AVATAR_NONE_VALUE,
      ),
    ).toEqual({ facialHairVariant: 'beardLight', facialHairProbability: 0 });
  });

  it('stores a picked variant with probability 100, other options as picked', () => {
    expect(
      withAvatarVariantSelection(
        { accessoriesVariant: 'round', accessoriesProbability: 0 },
        'accessoriesVariant',
        'kurt',
      ),
    ).toEqual({ accessoriesVariant: 'kurt', accessoriesProbability: 100 });
    expect(withAvatarVariantSelection({ flip: 'horizontal' }, 'flip', 'none')).toEqual({
      flip: 'none',
    });
  });

  it('keeps every pick on the allow-list', () => {
    let options: Record<string, string | number> = { topVariant: 'bob', topProbability: 100 };
    options = withAvatarVariantSelection(options, 'topVariant', AVATAR_NONE_VALUE);
    expect(generatedAvatarProblem({ style: 'avataaars', seed: 'a', options })).toBeNull();
    options = withAvatarVariantSelection(options, 'topVariant', 'hat');
    expect(generatedAvatarProblem({ style: 'avataaars', seed: 'a', options })).toBeNull();
  });

  it('hides the colors of a component set to None', () => {
    const none = { topProbability: 0, accessoriesProbability: 0, facialHairProbability: 0 };
    for (const key of ['hairColor', 'hatColor', 'accessoriesColor', 'facialHairColor']) {
      expect(avatarColorShown(none, key)).toBe(false);
      expect(avatarColorShown({}, key)).toBe(true);
    }
    expect(avatarColorShown(none, 'skinColor')).toBe(true);
    expect(avatarColorShown({ topProbability: 0 }, 'facialHairColor')).toBe(true);
  });

  it('lets Random pick None', () => {
    const random = seeded(11);
    const picks = Array.from({ length: 50 }, () =>
      avatarVariantSelection(randomGeneratedAvatar(random).options, 'accessoriesVariant'),
    );
    expect(picks).toContain(AVATAR_NONE_VALUE);
    expect(picks.some((p) => p !== AVATAR_NONE_VALUE)).toBe(true);
  });
});
