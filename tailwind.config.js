// Copyright (c) 2024-2026 EVtivity. All rights reserved.
// SPDX-License-Identifier: BUSL-1.1

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        card: 'hsl(var(--card) / <alpha-value>)',
        'card-foreground': 'hsl(var(--card-foreground) / <alpha-value>)',
        elevated: 'hsl(var(--elevated) / <alpha-value>)',
        primary: 'hsl(var(--primary) / <alpha-value>)',
        'primary-foreground': 'hsl(var(--primary-foreground) / <alpha-value>)',
        cta: 'hsl(var(--cta) / <alpha-value>)',
        'cta-foreground': 'hsl(var(--cta-foreground) / <alpha-value>)',
        accent: 'hsl(var(--accent) / <alpha-value>)',
        'accent-foreground': 'hsl(var(--accent-foreground) / <alpha-value>)',
        muted: 'hsl(var(--muted) / <alpha-value>)',
        'muted-foreground': 'hsl(var(--muted-foreground) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--border) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        success: 'hsl(var(--success) / <alpha-value>)',
        warning: 'hsl(var(--warning) / <alpha-value>)',
        'warning-text': 'hsl(var(--warning-text) / <alpha-value>)',
        destructive: 'hsl(var(--destructive) / <alpha-value>)',
        info: 'hsl(var(--info) / <alpha-value>)',
      },
      // The radius tiers follow the driver's theme (Soft rounds them more). The
      // ThemeProvider sets the variables (src/lib/theme-tokens.ts radiusVars);
      // global.css holds the Default values.
      borderRadius: {
        '2xl': 'var(--radius-2xl)',
        xl: 'var(--radius-xl)',
        lg: 'var(--radius-lg)',
        md: 'var(--radius-md)',
        sm: 'var(--radius-sm)',
      },
      fontFamily: {
        sans: ['Inter_400Regular'],
        medium: ['Inter_500Medium'],
        semibold: ['Inter_600SemiBold'],
        bold: ['Inter_700Bold'],
        extrabold: ['Inter_800ExtraBold'],
      },
      // Pin body/caption sizes to absolute pixels. NativeWind's native rem is 14,
      // so the default rem-relative `text-sm` rendered ~12px, smaller than the
      // 14px body variant. Pinning makes `text-sm` body text match the body size.
      fontSize: {
        xs: '12px',
        sm: '14px',
      },
    },
  },
  plugins: [],
};
