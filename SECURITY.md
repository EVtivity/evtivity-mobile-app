# Security

The app's security posture. The baseline aligns to OWASP MASVS.

## Credential storage

Tokens are stored only in `expo-secure-store`, backed by the iOS Keychain and
the Android Keystore (EncryptedSharedPreferences). Tokens never go in
AsyncStorage, plain files, or the JS bundle.

## Authentication

- Every request carries `Authorization: Bearer <access token>`. The access token
  is short-lived (1 hour).
- A device-bound refresh token rotates on each use. Refresh is single-use:
  the server invalidates the old token and issues a new pair. Reuse of a spent
  token is treated as theft and revokes the session.
- Every request sends `X-Device-Id`. The backend binds the refresh token to that
  device id, so a token lifted to another device fails to refresh.
- Silent refresh runs on a 401 with single-flight de-duplication, so concurrent
  requests share one refresh round-trip.
- Logout sends the refresh token to the server for revocation and wipes all
  secure storage on the device.

## App lock and session

- Biometric app-lock via `expo-local-authentication` (Face ID, Touch ID,
  fingerprint) on launch and on resume from background. Configurable per brand.
- A step-up biometric prompt guards sensitive actions such as adding a payment
  method or starting a paid session.
- Auto-logout after inactivity and after the app stays backgrounded beyond a
  threshold.

## Payments

Card entry is owned entirely by the Stripe React Native SDK (PaymentSheet). Card
numbers never enter the app's JavaScript. PCI scope stays with Stripe. The
Stripe publishable key is fetched from the API at runtime, not bundled.

## Transport

- HTTPS only. No cleartext traffic.
- No server secrets in the app. The brand `apiUrl` is configuration, not a
  secret.

## Push notifications

On login, the app registers its Expo push token with the backend
(`POST /v1/portal/notifications/push-token`). On logout it unregisters the token
so a signed-out device receives no further push.

## Logging

Logs are sanitized. No tokens, PII, or card data reach logs, matching the
portal's access-log sanitization.

## Bot and abuse defense

The web portal uses reCAPTCHA v3, which is web-only. The backend enforces an
equivalent protection server-side. On mobile, device attestation (Apple App
Attest and Google Play Integrity), verified server-side, is the planned bot
defense in place of reCAPTCHA.

## Roadmap

Planned hardening, not yet shipped:

- Certificate or public-key pinning so a compromised CA cannot MITM the API.
- App Attest and Play Integrity attestation verified server-side.
- Jailbreak and root detection, with warn or restrict as a per-operator policy.
