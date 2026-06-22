# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Project: Finances (offline personal finance app)

Core constraint: **100% offline**. No network at runtime, no cloud, no telemetry.
All data is in an encrypted SQLite DB. Do not add anything that phones home.

## Gotchas / non-obvious facts
- **Disk**: the root disk (`/`) is tiny and was full. npm cache is redirected to
  the big volume via a gitignored `.npmrc` (`cache=/media/lino/New Volume/.npm-cache`).
  Run installs with `TMPDIR="/media/lino/New Volume/.tmp"` to avoid filling `/`.
- **No Expo Go**: native modules (SQLCipher, SMS, biometrics) require a dev build.
- **react-navigation is vendored inside expo-router** — import `ThemeProvider`,
  `DefaultTheme`, `DarkTheme` from `expo-router`, NOT `@react-navigation/native`
  (that package isn't installed).
- **Encrypted DB**: `src/db/client.ts` opens expo-sqlite with `PRAGMA key` (raw
  hex key from expo-secure-store). SQLCipher is enabled via the `expo-sqlite`
  plugin (`useSQLCipher: true`) in app.json.
- **SMS is Android-only** (iOS can't read the inbox). The native module
  (`react-native-get-sms-android`) is `require()`d lazily inside Android guards.
- **Money is pure & tested** in `src/money/*`; the **SMS parser** is pure & tested
  in `src/sms/*`. Keep logic there (testable) and out of components.
- **Offline FX**: rates are user-entered (`fx_rates` table) — never fetch rates.
- **Production offline build**: `app.config.js` strips the INTERNET permission
  when `OFFLINE_BUILD=1` (see BUILD.md). Dev builds keep it for Metro.
- `expo-file-system` legacy API is imported from `expo-file-system/legacy`.

## Checks
`npm run typecheck` · `npm test` · `npx expo export --platform android` (bundle check).
