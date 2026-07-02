import { getDb } from '../client';
import { newId } from '../id';
import type { Transfer } from '../schema';
import type { CurrencyCode } from '@/money/currencies';

export interface TransferView extends Transfer {
  from_name: string;
  to_name: string;
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
}

export interface TransferInput {
  from_account_id: string;
  to_account_id: string;
  from_amount: number;
  to_amount: number;
  rate: number;
  fee?: number;
  fee_currency?: CurrencyCode | null;
  occurred_at: number;
  note?: string | null;
}

export async function listTransfers(limit?: number): Promise<TransferView[]> {
  const db = await getDb();
  const limitSql = limit ? `LIMIT ${Math.floor(limit)}` : '';
  return db.getAllAsync<TransferView>(
    `SELECT tr.*, af.name AS from_name, at.name AS to_name,
            af.currency AS from_currency, at.currency AS to_currency
     FROM transfers tr
     JOIN accounts af ON tr.from_account_id = af.id
     JOIN accounts at ON tr.to_account_id = at.id
     ORDER BY tr.occurred_at DESC, tr.created_at DESC ${limitSql}`,
  );
}

/** Transfers touching one account (either side), newest first. */
export async function listTransfersForAccount(accountId: string): Promise<TransferView[]> {
  const db = await getDb();
  return db.getAllAsync<TransferView>(
    `SELECT tr.*, af.name AS from_name, at.name AS to_name,
            af.currency AS from_currency, at.currency AS to_currency
     FROM transfers tr
     JOIN accounts af ON tr.from_account_id = af.id
     JOIN accounts at ON tr.to_account_id = at.id
     WHERE tr.from_account_id = ? OR tr.to_account_id = ?
     ORDER BY tr.occurred_at DESC, tr.created_at DESC`,
    [accountId, accountId],
  );
}

export async function createTransfer(input: TransferInput): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO transfers (id, from_account_id, to_account_id, from_amount, to_amount, rate, fee, fee_currency, occurred_at, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.from_account_id,
      input.to_account_id,
      input.from_amount,
      input.to_amount,
      input.rate,
      input.fee ?? 0,
      input.fee_currency ?? null,
      input.occurred_at,
      input.note ?? null,
      Date.now(),
    ],
  );
  return id;
}

export async function deleteTransfer(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM transfers WHERE id = ?', [id]);
}
