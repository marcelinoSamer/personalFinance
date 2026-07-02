import { getDb } from '../client';
import { newId } from '../id';
import type { EventBox } from '../schema';
import type { CurrencyCode } from '@/money/currencies';

/** Icon used on the hidden account so box rows are recognizable in lists. */
export const BOX_ICON = 'party-popper';

// Rotating palette for new boxes — these colors also mark the box's slice in
// analytics, so keep them distinct from the seeded category colors.
const BOX_COLORS = ['#5C6BC0', '#F06292', '#4DB6AC', '#FFB74D', '#9575CD', '#4FC3F7'];

export function nextBoxColor(existingCount: number): string {
  return BOX_COLORS[existingCount % BOX_COLORS.length];
}

export interface EventBoxView extends EventBox {
  /** Everything put into the box: transfers in + income recorded on it. */
  funded: number;
  /** Money moved back out (leftover returns, incl. fees). */
  returned: number;
  /** Expenses paid from the box. */
  spent: number;
  /** funded - returned - spent. */
  balance: number;
}

const VIEW_SELECT = `
  SELECT b.*,
         COALESCE(tin.total, 0) + COALESCE(inc.total, 0) AS funded,
         COALESCE(tout.total, 0) AS returned,
         COALESCE(exp.total, 0) AS spent,
         COALESCE(tin.total, 0) + COALESCE(inc.total, 0)
           - COALESCE(tout.total, 0) - COALESCE(exp.total, 0) AS balance
  FROM event_boxes b
  LEFT JOIN (SELECT to_account_id AS aid, SUM(to_amount) AS total
             FROM transfers GROUP BY to_account_id) tin ON tin.aid = b.account_id
  LEFT JOIN (SELECT from_account_id AS aid, SUM(from_amount + fee) AS total
             FROM transfers GROUP BY from_account_id) tout ON tout.aid = b.account_id
  LEFT JOIN (SELECT account_id AS aid, SUM(amount) AS total
             FROM transactions WHERE kind = 'expense' GROUP BY account_id) exp ON exp.aid = b.account_id
  LEFT JOIN (SELECT account_id AS aid, SUM(amount) AS total
             FROM transactions WHERE kind = 'income' GROUP BY account_id) inc ON inc.aid = b.account_id
`;

export async function listBoxes(includeClosed = true): Promise<EventBoxView[]> {
  const db = await getDb();
  const where = includeClosed ? '' : 'WHERE b.closed_at IS NULL';
  return db.getAllAsync<EventBoxView>(
    `${VIEW_SELECT} ${where} ORDER BY b.starts_at ASC, b.created_at ASC`,
  );
}

export async function getBox(id: string): Promise<EventBoxView | null> {
  const db = await getDb();
  return db.getFirstAsync<EventBoxView>(`${VIEW_SELECT} WHERE b.id = ?`, [id]);
}

export async function getBoxByAccount(accountId: string): Promise<EventBoxView | null> {
  const db = await getDb();
  return db.getFirstAsync<EventBoxView>(`${VIEW_SELECT} WHERE b.account_id = ?`, [accountId]);
}

export interface BoxInput {
  name: string;
  budget_amount: number;
  currency: CurrencyCode;
  starts_at: number;
  ends_at: number;
  color?: string | null;
  note?: string | null;
}

/** Creates the box and its hidden 'box' account in one transaction. */
export async function createBox(input: BoxInput): Promise<string> {
  const db = await getDb();
  const boxId = newId();
  const accountId = newId();
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    const row = await db.getFirstAsync<{ m: number | null }>(
      'SELECT MAX(sort_order) AS m FROM accounts',
    );
    await db.runAsync(
      `INSERT INTO accounts (id, name, type, currency, opening_balance, icon, color, archived, sort_order, created_at)
       VALUES (?, ?, 'box', ?, 0, ?, ?, 0, ?, ?)`,
      [accountId, input.name, input.currency, BOX_ICON, input.color ?? null, (row?.m ?? -1) + 1, now],
    );
    await db.runAsync(
      `INSERT INTO event_boxes (id, account_id, name, budget_amount, currency, starts_at, ends_at, color, note, closed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
      [
        boxId,
        accountId,
        input.name,
        input.budget_amount,
        input.currency,
        input.starts_at,
        input.ends_at,
        input.color ?? null,
        input.note ?? null,
        now,
      ],
    );
  });
  return boxId;
}

export async function updateBox(id: string, input: BoxInput): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE event_boxes SET name = ?, budget_amount = ?, currency = ?, starts_at = ?, ends_at = ?, color = ?, note = ? WHERE id = ?`,
      [
        input.name,
        input.budget_amount,
        input.currency,
        input.starts_at,
        input.ends_at,
        input.color ?? null,
        input.note ?? null,
        id,
      ],
    );
    // Keep the hidden account in sync so pickers and history show fresh data.
    await db.runAsync(
      `UPDATE accounts SET name = ?, currency = ?, color = ?
       WHERE id = (SELECT account_id FROM event_boxes WHERE id = ?)`,
      [input.name, input.currency, input.color ?? null, id],
    );
  });
}

/** Settle the box: archive its account so it leaves every picker. */
export async function closeBox(id: string): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE event_boxes SET closed_at = ? WHERE id = ?', [Date.now(), id]);
    await db.runAsync(
      'UPDATE accounts SET archived = 1 WHERE id = (SELECT account_id FROM event_boxes WHERE id = ?)',
      [id],
    );
  });
}

export async function reopenBox(id: string): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE event_boxes SET closed_at = NULL WHERE id = ?', [id]);
    await db.runAsync(
      'UPDATE accounts SET archived = 0 WHERE id = (SELECT account_id FROM event_boxes WHERE id = ?)',
      [id],
    );
  });
}

/** Deletes the hidden account; the box row, its transactions and transfers cascade. */
export async function deleteBox(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM accounts WHERE id = (SELECT account_id FROM event_boxes WHERE id = ?)', [id]);
}
