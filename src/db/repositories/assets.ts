import { getDb } from '../client';
import { newId } from '../id';
import type { Asset, AssetType } from '../schema';
import type { CurrencyCode } from '@/money/currencies';

export interface AssetInput {
  name: string;
  type: AssetType;
  quantity: number;
  unit?: string | null;
  value: number;
  currency: CurrencyCode;
  valued_at: number;
  note?: string | null;
}

export async function listAssets(): Promise<Asset[]> {
  const db = await getDb();
  return db.getAllAsync<Asset>('SELECT * FROM assets ORDER BY created_at DESC');
}

export async function getAsset(id: string): Promise<Asset | null> {
  const db = await getDb();
  return db.getFirstAsync<Asset>('SELECT * FROM assets WHERE id = ?', [id]);
}

export async function createAsset(input: AssetInput): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO assets (id, name, type, quantity, unit, value, currency, valued_at, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.type,
      input.quantity,
      input.unit ?? null,
      input.value,
      input.currency,
      input.valued_at,
      input.note ?? null,
      Date.now(),
    ],
  );
  return id;
}

export async function updateAsset(id: string, input: AssetInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE assets SET name = ?, type = ?, quantity = ?, unit = ?, value = ?, currency = ?, valued_at = ?, note = ? WHERE id = ?`,
    [
      input.name,
      input.type,
      input.quantity,
      input.unit ?? null,
      input.value,
      input.currency,
      input.valued_at,
      input.note ?? null,
      id,
    ],
  );
}

export async function deleteAsset(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM assets WHERE id = ?', [id]);
}
