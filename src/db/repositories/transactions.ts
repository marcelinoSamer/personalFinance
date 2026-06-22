import { getDb } from '../client';
import { newId } from '../id';
import type { Transaction, TxKind, TxSource } from '../schema';
import type { CurrencyCode } from '@/money/currencies';

export interface TransactionView extends Transaction {
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  account_name: string;
}

export interface TransactionInput {
  account_id: string;
  kind: TxKind;
  amount: number;
  currency: CurrencyCode;
  category_id?: string | null;
  merchant?: string | null;
  note?: string | null;
  occurred_at: number;
  source?: TxSource;
  sms_ref?: string | null;
}

export interface TxFilter {
  accountId?: string;
  kind?: TxKind;
  categoryId?: string;
  from?: number;
  to?: number;
  search?: string;
  limit?: number;
}

const VIEW_SELECT = `
  SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
         a.name AS account_name
  FROM transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  JOIN accounts a ON t.account_id = a.id
`;

export async function listTransactions(filter: TxFilter = {}): Promise<TransactionView[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (filter.accountId) {
    where.push('t.account_id = ?');
    params.push(filter.accountId);
  }
  if (filter.kind) {
    where.push('t.kind = ?');
    params.push(filter.kind);
  }
  if (filter.categoryId) {
    where.push('t.category_id = ?');
    params.push(filter.categoryId);
  }
  if (filter.from != null) {
    where.push('t.occurred_at >= ?');
    params.push(filter.from);
  }
  if (filter.to != null) {
    where.push('t.occurred_at <= ?');
    params.push(filter.to);
  }
  if (filter.search) {
    where.push('(t.merchant LIKE ? OR t.note LIKE ?)');
    params.push(`%${filter.search}%`, `%${filter.search}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const limitSql = filter.limit ? `LIMIT ${Math.floor(filter.limit)}` : '';
  return db.getAllAsync<TransactionView>(
    `${VIEW_SELECT} ${whereSql} ORDER BY t.occurred_at DESC, t.created_at DESC ${limitSql}`,
    params,
  );
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  const db = await getDb();
  return db.getFirstAsync<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
}

export async function createTransaction(input: TransactionInput): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO transactions (id, account_id, kind, amount, currency, category_id, merchant, note, occurred_at, source, sms_ref, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.account_id,
      input.kind,
      input.amount,
      input.currency,
      input.category_id ?? null,
      input.merchant ?? null,
      input.note ?? null,
      input.occurred_at,
      input.source ?? 'manual',
      input.sms_ref ?? null,
      Date.now(),
    ],
  );
  return id;
}

export async function updateTransaction(id: string, input: TransactionInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE transactions SET account_id = ?, kind = ?, amount = ?, currency = ?, category_id = ?, merchant = ?, note = ?, occurred_at = ? WHERE id = ?`,
    [
      input.account_id,
      input.kind,
      input.amount,
      input.currency,
      input.category_id ?? null,
      input.merchant ?? null,
      input.note ?? null,
      input.occurred_at,
      id,
    ],
  );
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
}

export interface KindCurrencySum {
  kind: TxKind;
  currency: CurrencyCode;
  total: number;
}

/** Sum amounts grouped by kind+currency within [from, to]. */
export async function sumByKindCurrency(from: number, to: number): Promise<KindCurrencySum[]> {
  const db = await getDb();
  return db.getAllAsync<KindCurrencySum>(
    `SELECT kind, currency, SUM(amount) AS total
     FROM transactions WHERE occurred_at >= ? AND occurred_at <= ?
     GROUP BY kind, currency`,
    [from, to],
  );
}
