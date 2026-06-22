import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

import { runMigrations } from './migrations';

const DB_NAME = 'finances.db';
const KEY_STORE_KEY = 'finances.db.key.v1';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

/**
 * Returns the SQLCipher raw key (64 hex chars = 32 bytes), generating and
 * persisting it in the OS keystore (Android Keystore / iOS Keychain) on first
 * launch. The key never leaves the device.
 */
async function getOrCreateKey(): Promise<string> {
  let hex = await SecureStore.getItemAsync(KEY_STORE_KEY);
  if (!hex) {
    const bytes = await Crypto.getRandomBytesAsync(32);
    hex = bytesToHex(bytes);
    await SecureStore.setItemAsync(KEY_STORE_KEY, hex, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
  }
  return hex;
}

async function open(): Promise<SQLite.SQLiteDatabase> {
  const key = await getOrCreateKey();
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  // SQLCipher: the key MUST be applied before any other statement. Using a raw
  // hex key (x'...') skips the KDF and avoids quoting issues.
  await db.execAsync(`PRAGMA key = "x'${key}'";`);
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await runMigrations(db);
  return db;
}

/** Lazily open (and migrate) the encrypted database. Safe to call repeatedly. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = open();
  return dbPromise;
}

export type DB = SQLite.SQLiteDatabase;
