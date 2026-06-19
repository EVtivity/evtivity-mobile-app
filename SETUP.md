# Setup

How to install the toolchain and build the app locally. The exact versions below
are the ones this app was built and verified against (Expo SDK 52, React Native
0.76, New Architecture).

## 1. Common tools (both platforms)

| Tool | Version used | Install |
|---|---|---|
| Node.js | 24 LTS (verified on 24.12) | `brew install node` or nvm |
| npm | 10+ (verified on 11.6) | ships with Node |
| Watchman | 2026.06 | `brew install watchman` (optional, see gotcha 2) |
| Expo CLI / EAS CLI | via `npx` | no global install needed (`npx expo`, `npx eas-cli`) |

```bash
npm install
cp .env.example .env
```

Set `ACTIVE_BRAND` in `.env` to a slug registered in `brands/index.js` (`default`
to start). Set `EXPO_PUBLIC_API_URL` to the EVtivity API the app should call, or
edit `apiUrl` in `brands/index.js`. Without a reachable API the app runs but
cannot log in.

Align dependency versions to the installed Expo SDK (run after install and after
any SDK change):

```bash
npx expo install --fix
```

## 2. Android toolchain

The app was built on Android with no Android Studio and no `sudo`, using only the
SDK command-line tools. Either install Android Studio (which bundles all of this)
or follow the CLI-only recipe below.

### Required components

| Component | Version used | Notes |
|---|---|---|
| JDK | Temurin 17 (17.0.19) | Gradle for RN 0.76 requires JDK 17, not 11 or 21. |
| Android SDK platform | `platforms;android-35` | compileSdk/targetSdk 35 |
| Build-tools | `build-tools;35.0.0` (and `34.0.0`) | 34 is pulled in by a native module |
| Platform-tools | 37.0.0 | `adb` |
| Emulator | 36.6.11 | |
| System image | `system-images;android-35;google_apis;arm64-v8a` | arm64 for Apple Silicon |
| NDK | 26.1.10909125 | auto-installed by Gradle on first build (~1 GB) |
| CMake | auto | auto-installed by Gradle |

### CLI-only install (no Android Studio, no sudo)

```bash
# JDK 17 (direct tarball, installs to ~/.jdks, no admin rights)
mkdir -p ~/.jdks/temurin-17
curl -fsSL "https://api.adoptium.net/v3/binary/latest/17/ga/mac/aarch64/jdk/hotspot/normal/eclipse?project=jdk" \
  | tar -xz -C ~/.jdks/temurin-17 --strip-components=1

# Android SDK command-line tools
mkdir -p ~/Library/Android/sdk/cmdline-tools
curl -fsSL -o /tmp/cmdtools.zip \
  "https://dl.google.com/android/repository/commandlinetools-mac-11076708_latest.zip"
unzip -q /tmp/cmdtools.zip -d /tmp/cmt
mv /tmp/cmt/cmdline-tools ~/Library/Android/sdk/cmdline-tools/latest

# Environment (add to ~/.zshrc to persist)
export JAVA_HOME="$HOME/.jdks/temurin-17/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$JAVA_HOME/bin:$PATH"

# SDK packages (~1.5 GB)
yes | sdkmanager --licenses
sdkmanager "platform-tools" "emulator" "platforms;android-35" \
  "build-tools;35.0.0" "system-images;android-35;google_apis;arm64-v8a"

# Create and start an emulator
echo no | avdmanager create avd -n evtivity \
  -k "system-images;android-35;google_apis;arm64-v8a" -d pixel_7
emulator -avd evtivity &
```

### Build and run

```bash
npx expo run:android        # prebuild + Gradle build + install + launch + Metro
```

The first build takes 30 to 40 minutes (it downloads the NDK, all native-module
Maven dependencies, and compiles C++ with CMake). Subsequent builds take 1 to 3
minutes; code-only changes hot-reload through Metro in seconds.

## 3. iOS toolchain

| Component | Version | Install |
|---|---|---|
| Xcode | latest | App Store (~7 GB, GUI, requires Apple ID). Cannot be scripted. |
| Command Line Tools | bundled | `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` |
| CocoaPods | 1.x | `brew install cocoapods` |
| watchman | latest | `brew install watchman` |
| Apple Developer Program | 99 USD/yr | required for App Store, APNs push, and App Attest |

```bash
npx expo run:ios            # prebuild + pod install + Xcode build + launch
```

## 4. Store / release builds

Both store accounts are paid by each operator for their own listing: Apple
Developer Program 99 USD/yr, Google Play 25 USD one-time. The app and all
libraries are free and open source.

`eas build --local` runs the build on your machine (free, no EAS cloud minutes):

```bash
npm run build:android       # eas build --local --platform android --profile production
npm run build:ios           # eas build --local --platform ios --profile production  (needs Xcode + Apple signing)
```

## Gotchas hit during the verified build

1. **Gradle distribution download times out.** The Gradle wrapper fetches
   `gradle-8.10.2-all.zip` (~200 MB) with a hard 10 s read timeout; on a slow
   link it fails with `SocketTimeoutException`. Fix: pre-download the smaller
   `-bin` distribution and point the wrapper at the local file:
   ```bash
   curl -fsSL -o /tmp/gradle-8.10.2-bin.zip \
     https://services.gradle.org/distributions/gradle-8.10.2-bin.zip
   # in android/gradle/wrapper/gradle-wrapper.properties:
   #   distributionUrl=file\:/tmp/gradle-8.10.2-bin.zip
   ```

2. **Watchman hangs under ~/Desktop or ~/Documents.** macOS TCC protects those
   folders, so Watchman cannot watch the project and Metro stalls forever on
   `Waiting for Watchman 'watch-project'`. This repo ships `metro.config.js` with
   `config.resolver.useWatchman = false`, which uses Metro's node file crawler and
   needs no special permission. If you move the project outside a protected folder
   (or grant your terminal Full Disk Access), you can remove that line to get
   Watchman's faster file watching.

## Troubleshooting

- Dependency version mismatch warnings: `npx expo install --fix`.
- Gradle cannot find Java / wrong Java: confirm `java -version` is 17 and
  `JAVA_HOME` points at the Temurin 17 home.
- `adb` not found: ensure `$ANDROID_HOME/platform-tools` is on `PATH`.
- Stale native build after a brand/config change: delete `android/` and `ios/`,
  then `npx expo prebuild`.
- Metro cache or unexpected bundling errors: `npx expo start --clear`.
- iOS pod errors after prebuild: `cd ios && pod install`.
- Camera / biometric / notification permission missing at runtime: the strings
  come from `app.config.ts`; re-run `npx expo prebuild` after editing it.
