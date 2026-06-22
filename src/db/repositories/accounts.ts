import { getDb } from '../client';
import { newId } from '../id';
import type { Account, AccountType } from '../schema';
import type { CurrencyCode } from '@/money/currencies';

export interface AccountWithBalance extends Account {
  balance: number;
}

export interface AccountInput {
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  opening_balance: number;
  icon?: string | null;
  color?: string | null;
}

export async function getAccount(id: string): Promise<Account | null> {
  const db = await getDb();
  return db.getFirstAsync<Account>('SELECT * FROM accounts WHERE id = ?', [id]);
}

export async function listAccounts(includeArchived = false): Promise<Account[]> {
  const db = await getDb();
  const where = includeArchived ? '' : 'WHERE archived = 0';
  return db.getAllAsync<Account>(
    `SELECT * FROM accounts ${where} ORDER BY archived ASC, sort_order ASC, created_at ASC`,
  );
}

/**
 * Lists accounts with their current balance:
 *   opening_balance + income - expense + transfers_in - (transfers_out + fees)
 * Fees are always charged in the source account's currency.
 */
export async function listAccountsWithBalances(
  includeArchived = false,
): Promise<AccountWithBalance[]> {
  const db = await getDb();
  const accounts = await listAccounts(includeArchived);

  const tx = await db.getAllAsync<{ account_id: string; kind: string; total: number }>(
    `SELECT account_id, kind, SUM(amount) AS total FROM transactions GROUP BY account_id, kind`,
  );
  const inflow = await db.getAllAsync<{ to_account_id: string; total: number }>(
    `SELECT to_account_id, SUM(to_amount) AS total FROM transfers GROUP BY to_account_id`,
  );
  const outflow = await db.getAllAsync<{ from_account_id: string; total: number }>(
    `SELECT from_account_id, SUM(from_amount + fee) AS total FROM transfers GROUP BY from_account_id`,
  );

  const delta = new Map<string, number>();
  const add = (id: string, v: number) => delta.set(id, (delta.get(id) ?? 0) + v);
  for (const r of tx) add(r.account_id, r.kind === 'income' ? r.total : -r.total);
  for (const r of inflow) add(r.to_account_id, r.total);
  for (const r of outflow) add(r.from_account_id, -r.total);

  return accounts.map((a) => ({ ...a, balance: a.opening_balance + (delta.get(a.id) ?? 0) }));
}

export async function createAccount(input: AccountInput): Promise<string> {
  const db = await getDb();
  const id = newId();
  const order = await nextSortOrder(db);
  await db.runAsync(
    `INSERT INTO accounts (id, name, type, currency, opening_balance, icon, color, archived, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      id,
      input.name,
      input.type,
      input.currency,
      input.opening_balance,
      input.icon ?? null,
      input.color ?? null,
      order,
      Date.now(),
    ],
  );
  return id;
}

export async function updateAccount(id: string, input: AccountInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE accounts SET name = ?, type = ?, currency = ?, opening_balance = ?, icon = ?, color = ? WHERE id = ?`,
    [input.name, input.type, input.currency, input.opening_balance, input.icon ?? null, input.color ?? null, id],
  );
}

export async function setArchived(id: string, archived: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE accounts SET archived = ? WHERE id = ?', [archived ? 1 : 0, id]);
}

export async function deleteAccount(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM accounts WHERE id = ?', [id]);
}

async function nextSortOrder(db: Awaited<ReturnType<typeof getDb>>): Promise<number> {
  const row = await db.getFirstAsync<{ m: number | null }>(
    'SELECT MAX(sort_order) AS m FROM accounts',
  );
  return (row?.m ?? -1) + 1;
}
