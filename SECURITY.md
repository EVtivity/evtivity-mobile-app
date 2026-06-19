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

## App lock

- Optional biometric app-lock via `expo-local-authentication` (Face ID, Touch ID,
  fingerprint). When the user enables it, the app gates behind a biometric prompt
  on launch and re-locks when it leaves the foreground. Configurable per brand and
  per user.

## Payments

Card entry is owned entirely by the Stripe React Native SDK (PaymentSheet). Card
numbers never enter the app's JavaScript. PCI scope stays with Stripe. The
Stripe publishable key is fetched from the API at runtime, not bundled.

## Transport

- HTTPS by default. When the brand `apiUrl` is HTTPS, no cleartext exception is
  added, so the app makes no plaintext HTTP requests. If an operator points the
  app at a plain-HTTP CSMS, a scoped cleartext exception is added for that one
  host only (iOS ATS and the Android manifest); every other host stays
  HTTPS-only.
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

The web portal uses reCAPTCHA v3, which is web-only. On mobile, device
attestation replaces it: a native module produces an Apple App Attest assertion
on iOS and a Google Play Integrity token on Android, which the app attaches as
`X-Attest-*` headers on sensitive pre-auth requests (login, register, password
reset) for the backend to verify server-side.

## Roadmap

Planned hardening, not yet shipped:

- Certificate or public-key pinning so a compromised CA cannot MITM the API.
- Jailbreak and root detection, with warn or restrict as a per-operator policy.
