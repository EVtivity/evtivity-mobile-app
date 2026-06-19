# White-label

How an operator ships this app under their own identity. One codebase, one edit
to `brands/index.js` plus three assets per operator. You do not edit
`app.config.ts`, `src/`, or `app/`.

The brand registry is plain JavaScript (`brands/index.js`), not TypeScript,
because Expo's config loader requires it at build time without TypeScript
transpilation. Types live in `brands/index.d.ts`, so editors still type-check
your brand object.

## Steps

1. Open `brands/index.js` and copy the `defaultBrand` object to a new constant,
   for example `acmeBrand`.

2. Edit the fields on your new brand object:

   | Field | What to set |
   |---|---|
   | `name` | Display name shown under the icon and in stores. |
   | `slug` | Unique short id. Matches the registry key and `ACTIVE_BRAND`. |
   | `scheme` | URL scheme for deep links (`acme://`). Lowercase, no spaces. |
   | `iosBundleId` | Your reverse-DNS iOS bundle identifier (`com.acme.driver`). |
   | `androidPackage` | Your Android package name (`com.acme.driver`). |
   | `apiUrl` | Base URL of your EVtivity API deployment. |
   | `easProjectId` | Your Expo EAS project id. Required to mint push tokens. |
   | `termsUrl` / `privacyUrl` | Full URLs to your legal pages. Leave empty to derive them from your CSMS portal. |
   | `languages` | Languages offered in the app, from `en`, `es`, `zh`, `de`, `ko`, `zh-TW`. The first entry is the default for a fresh install. Omit to offer all. See [Languages](#languages). |
   | `colors` | Light and dark palettes. See below. |
   | `icon` / `adaptiveIcon` / `splash` | Asset paths, default to `./assets/*`. |

3. Register the brand in the `brands` map in the same file:

   ```js
   const brands = {
     default: defaultBrand,
     acme: acmeBrand,
   };
   ```

4. Replace the assets in `assets/` with your artwork, keeping the filenames (or
   update the brand's asset paths). Sizes:

   | File | Size |
   |---|---|
   | `icon.png` | 1024x1024 |
   | `adaptive-icon.png` | 1024x1024 (safe zone 66%) |
   | `splash.png` | 1284x2778 |

5. Select the brand:

   ```bash
   echo "ACTIVE_BRAND=acme" >> .env     # local
   ```

   In CI, pass `acme` as the `brand` workflow input to `build.yml` or
   `release.yml`.

6. Build:

   ```bash
   npx expo prebuild        # regenerates native projects for the brand
   npm run build:ios        # or build:android, or run via CI
   ```

You own your certificates, signing, store listings, Stripe account
(server-side), and API deployment.

## Colors

Each palette is a set of HSL triplets written as `"H S% L%"` strings (no `hsl()`
wrapper, no commas), for example `"221.2 83.2% 53.3%"`. They mirror the web
portal's css-spec tokens, so the app matches the portal design. NativeWind reads
these at runtime and maps them to theme tokens (`primary`, `cta`, `accent`,
`background`, `foreground`, `card`, `elevated`, `muted`, `border`, `ring`,
`success`, `warning`, `destructive`, `info`, and the matching foreground
variants).

Provide both `light` and `dark`. The app follows the device appearance and
switches palettes automatically.

## Languages

The app ships full translations for every language the CSMS supports: `en`
(English), `es` (Español), `zh` (简体中文), `de` (Deutsch), `ko` (한국어), and
`zh-TW` (繁體中文).

Set `languages` on your brand to the subset you want to offer. The first entry
is the default for a fresh install. Omit the field to offer all six.

```js
languages: ['en', 'es'],   // English + Spanish, English is the default
```

Drivers pick their language under Account → Personal Info. The choice switches
the UI immediately, persists across launches, and syncs to the driver's server
profile (used for emails and SMS too). On launch the app resolves the language
in this order: the driver's stored on-device choice, then their server
preference, then the brand default.

Only the languages in `languages` appear in the picker, but all catalogues are
bundled, so a driver whose server preference is outside your enabled set still
sees translated text rather than a fallback.

## Worked example

In `brands/index.js`, alongside `defaultBrand`:

```js
/** @type {import('./index').Brand} */
const acmeBrand = {
  name: 'Acme Charge',
  slug: 'acme',
  scheme: 'acmecharge',
  iosBundleId: 'com.acme.charge',
  androidPackage: 'com.acme.charge',
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://api.acmecharge.com',
  languages: ['en', 'es'],
  colors: {
    light: {
      primary: '142 71% 45%',
      primaryForeground: '0 0% 100%',
      background: '0 0% 100%',
      foreground: '222.2 84% 4.9%',
      card: '0 0% 100%',
      cardForeground: '222.2 84% 4.9%',
      muted: '210 40% 96.1%',
      mutedForeground: '215.4 16.3% 46.9%',
      border: '214.3 31.8% 91.4%',
      success: '142 71% 45%',
      warning: '37.7 92.1% 50.2%',
      destructive: '0 84.2% 60.2%',
      info: '189 94.5% 42.7%',
    },
    dark: {
      primary: '142 64% 52%',
      primaryForeground: '0 0% 100%',
      background: '222.2 84% 4.9%',
      foreground: '210 40% 98%',
      card: '217.2 32.6% 11%',
      cardForeground: '210 40% 98%',
      muted: '217.2 32.6% 17.5%',
      mutedForeground: '215 20.2% 65.1%',
      border: '217.2 32.6% 17.5%',
      success: '142 64% 52%',
      warning: '37.7 92.1% 40%',
      destructive: '0 62.8% 30.6%',
      info: '189 94.5% 30%',
    },
  },
  icon: './assets/icon.png',
  adaptiveIcon: './assets/adaptive-icon.png',
  splash: './assets/splash.png',
};
```

Register it, set `ACTIVE_BRAND=acme`, prebuild, and build.

## Licensing

The "one codebase, many brands" capability is a build-time feature. It is not a
grant to operate apps for multiple independent networks for free. Under the
Business Source License 1.1 (the same license as the EVtivity CSMS), free
production use is limited to a single charging network: you may build, publish,
and operate one branded app for your own network at no cost. Publishing or
operating branded versions of the app for more than one independent charging
network (white-label as a service, resale, or multi-tenant platforms) requires a
commercial license. See [LICENSE.md](./LICENSE.md), or contact
evtivity@gmail.com for commercial licensing.
