# Finances — offline personal finance app

A fully **offline, private** personal-finance app (Expo / React Native, TypeScript).
No accounts, no cloud, no telemetry — all data is stored **encrypted on-device**.

## Features

- **Containers** (named virtual accounts/wallets), multi-currency, with derived balances
- **Transactions** (income/expense) with categories, manual entry
- **Transfers / conversions** between containers, with a manual FX rate
- **Assets** (gold, stocks, crypto, property…) for full **net-worth** tracking
- **Net worth** in a chosen display currency via a user-maintained **FX rate table** (offline → no live rates)
- **Analytics**: spending by category (donut), income vs expenses trend, top merchants
- **Budgets** with progress + local **threshold notifications** (90% / 100%)
- **Goals / purchase plans** with progress and savings-rate projections
- **SMS auto-import (Android only)**: reads bank SMS from an allowlist of senders,
  parses English & Arabic messages (per-bank templates + generic extractor), and
  queues them for one-tap review. iOS cannot read SMS, so this is hidden there.
- **Security**: SQLCipher-encrypted DB (key in the OS keystore), biometric + PIN app lock
- **Encrypted local backup / restore** (passphrase-based; no cloud)

## Stack

Expo SDK 56 · expo-router · react-native-paper (MD3, RTL) · expo-sqlite + SQLCipher ·
expo-secure-store · zustand · i18n-js (English/Arabic) · react-native-gifted-charts ·
expo-notifications (local only) · react-native-get-sms-android (Android).

## Project layout

```
src/
  app/            expo-router screens (tabs + modals)
  db/             encrypted SQLite client, migrations, schema, repositories/
  money/          pure logic: currencies, format, fx, portfolio, planning, budgets
  sms/            parser: normalize, extractor (EN/AR), templates, scanner, dedup
  backup/         passphrase-encrypted export/import
  notifications/  local budget alerts
  state/          zustand stores + data hooks
  i18n/ theme/ ui/ components/ security/
```

## Develop

```bash
npm run typecheck   # tsc --noEmit
npm test            # jest (money, planning, SMS parser, backup crypto)
```

The app uses native modules and **cannot run in Expo Go** — see **[BUILD.md](./BUILD.md)**
for development builds, standalone APKs, and the offline (INTERNET-blocked) build.
