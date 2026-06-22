# Building the app

This is an **offline-first** personal finance app. It uses native modules
(encrypted SQLite/SQLCipher, secure store, biometrics, and — on Android — SMS
reading), so it **cannot run in Expo Go**. You need a *development build* or a
*standalone APK*.

> Disk note: this repo redirects the npm cache to the big volume via `.npmrc`
> (`cache=/media/lino/New Volume/.npm-cache`) because the root disk is small.
> Keep that file (it's gitignored).

## Prerequisites

- Node 20+, npm 10+
- An Android device or emulator (for the full feature set incl. SMS)
- For local builds: Android Studio + JDK 17 (and Xcode on macOS for iOS)

## Option A — EAS cloud build (easiest)

Builds the APK on Expo's servers. Your source is uploaded for the build only;
the resulting app is still 100% offline at runtime.

```bash
npm install -g eas-cli
eas login
eas build:configure
# Production APK with the offline guarantee (INTERNET permission removed):
OFFLINE_BUILD=1 eas build -p android --profile preview
```

Add this to `eas.json` so the env var reaches the build:

```json
{
  "build": {
    "preview": {
      "android": { "buildType": "apk" },
      "env": { "OFFLINE_BUILD": "1" }
    },
    "development": { "developmentClient": true, "distribution": "internal" }
  }
}
```

## Option B — Local build (fully offline, nothing leaves your machine)

```bash
# 1. Generate native projects (config plugins set up SQLCipher, SMS perms, etc.)
npx expo prebuild --clean

# 2a. Development build (connects to Metro; INTERNET kept):
npx expo run:android

# 2b. Production-style offline APK (INTERNET permission stripped):
cd android
OFFLINE_BUILD=1 ./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

Then `adb install -r app-release.apk`, or copy the APK to the device and install.

## Verifying it's offline

- A production build has **no INTERNET permission** (set via `OFFLINE_BUILD=1`,
  see `app.config.js`). Check `AndroidManifest.xml` after prebuild.
- The app works fully in **airplane mode**.

## SMS auto-import (Android only)

- iOS cannot read the SMS inbox — the SMS feature is hidden there.
- On first use, grant the SMS permission when prompted.
- Add your bank **sender IDs** under *More → SMS Import → ⚙ (senders)*, then tap
  **Scan now**. Parsed messages land in the review queue for one-tap confirm.
- To improve accuracy for a specific bank, confirm a message and tap
  **Save as template** (learns the direction/currency for that sender).

## Tests & checks

```bash
npm run typecheck   # tsc --noEmit
npm test            # jest unit tests (money, planning, SMS parser, backup crypto)
```
