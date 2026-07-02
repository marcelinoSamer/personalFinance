import { getDb } from '../client';
import type { CurrencyCode } from '@/money/currencies';
import type { TxKind } from '../schema';

export interface CategorySumRow {
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
  currency: CurrencyCode;
  total: number;
}

/**
 * Expense totals grouped by category and currency within a date range.
 * Spending from "Just this time" boxes is excluded — a box acts as its own
 * category in analytics (see expenseByBox) and stays out of monthly budgets.
 */
export async function expenseByCategory(from: number, to: number): Promise<CategorySumRow[]> {
  const db = await getDb();
  return db.getAllAsync<CategorySumRow>(
    `SELECT t.category_id, c.name AS category_name, c.color AS category_color, c.icon AS category_icon,
            t.currency, SUM(t.amount) AS total
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     JOIN accounts a ON t.account_id = a.id
     WHERE t.kind = 'expense' AND a.type <> 'box' AND t.occurred_at >= ? AND t.occurred_at <= ?
     GROUP BY t.category_id, t.currency`,
    [from, to],
  );
}

export interface BoxSumRow {
  box_id: string;
  box_name: string;
  box_color: string | null;
  currency: CurrencyCode;
  total: number;
}

/** Expense totals per "Just this time" box within a date range. */
export async function expenseByBox(from: number, to: number): Promise<BoxSumRow[]> {
  const db = await getDb();
  return db.getAllAsync<BoxSumRow>(
    `SELECT b.id AS box_id, b.name AS box_name, b.color AS box_color,
            t.currency, SUM(t.amount) AS total
     FROM transactions t
     JOIN event_boxes b ON t.account_id = b.account_id
     WHERE t.kind = 'expense' AND t.occurred_at >= ? AND t.occurred_at <= ?
     GROUP BY b.id, t.currency`,
    [from, to],
  );
}

export interface MerchantSumRow {
  merchant: string;
  currency: CurrencyCode;
  total: number;
}

export async function merchantTotals(
  from: number,
  to: number,
  kind: TxKind = 'expense',
): Promise<MerchantSumRow[]> {
  const db = await getDb();
  return db.getAllAsync<MerchantSumRow>(
    `SELECT merchant, currency, SUM(amount) AS total
     FROM transactions
     WHERE kind = ? AND merchant IS NOT NULL AND merchant <> ''
       AND occurred_at >= ? AND occurred_at <= ?
     GROUP BY merchant, currency`,
    [kind, from, to],
  );
}
