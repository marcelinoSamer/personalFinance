import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

import { getDb } from '@/db/client';
import { encrypt, decrypt, type EncryptedPayload } from './crypto';
import { bumpData } from '@/state/dataVersion';

const BACKUP_VERSION = 1;

// Parent-first order for inserts (FK-safe). Wipe uses the same set with FKs off.
const TABLES = [
  'categories',
  'accounts',
  'event_boxes',
  'assets',
  'fx_rates',
  'transactions',
  'transfers',
  'budgets',
  'goals',
  'sms_senders',
  'sms_templates',
  'sms_pending',
  'sms_seen',
  'settings',
];

export async function exportData(passphrase: string): Promise<void> {
  const db = await getDb();
  const tables: Record<string, unknown[]> = {};
  for (const tbl of TABLES) {
    tables[tbl] = await db.getAllAsync(`SELECT * FROM ${tbl}`);
  }
  const payload = { app: 'finances-backup', version: BACKUP_VERSION, exportedAt: Date.now(), tables };
  const enc = await encrypt(JSON.stringify(payload), passphrase);

  const uri = `${FileSystem.cacheDirectory}finances-backup-${Date.now()}.fbk`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(enc));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Finances backup',
    });
  }
}

export type ImportReason = 'cancelled' | 'wrong-pass' | 'invalid';
export interface ImportResult {
  ok: boolean;
  reason?: ImportReason;
}

export async function importData(passphrase: string): Promise<ImportResult> {
  const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
  if (picked.canceled || !picked.assets?.[0]) return { ok: false, reason: 'cancelled' };

  const json = await FileSystem.readAsStringAsync(picked.assets[0].uri);
  let enc: EncryptedPayload;
  try {
    enc = JSON.parse(json);
  } catch {
    return { ok: false, reason: 'invalid' };
  }

  const plain = await decrypt(enc, passphrase);
  if (plain == null) return { ok: false, reason: 'wrong-pass' };

  let payload: { tables?: Record<string, Record<string, unknown>[]> };
  try {
    payload = JSON.parse(plain);
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (!payload?.tables) return { ok: false, reason: 'invalid' };

  await restore(payload.tables);
  bumpData();
  return { ok: true };
}

async function restore(tables: Record<string, Record<string, unknown>[]>): Promise<void> {
  const db = await getDb();
  await db.execAsync('PRAGMA foreign_keys = OFF;');
  try {
    await db.withTransactionAsync(async () => {
      for (const tbl of TABLES) await db.runAsync(`DELETE FROM ${tbl}`);
      for (const tbl of TABLES) {
        for (const row of tables[tbl] ?? []) {
          const cols = Object.keys(row);
          if (cols.length === 0) continue;
          const placeholders = cols.map(() => '?').join(', ');
          await db.runAsync(
            `INSERT INTO ${tbl} (${cols.join(', ')}) VALUES (${placeholders})`,
            cols.map((c) => row[c] as never),
          );
        }
      }
    });
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON;');
  }
}
