import { getDb } from '../client';
import { newId } from '../id';
import type { Budget } from '../schema';
import type { CurrencyCode } from '@/money/currencies';

export interface BudgetView extends Budget {
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
}

export interface BudgetInput {
  category_id: string | null;
  limit_amount: number;
  currency: CurrencyCode;
}

export async function listBudgets(): Promise<BudgetView[]> {
  const db = await getDb();
  return db.getAllAsync<BudgetView>(
    `SELECT b.*, c.name AS category_name, c.color AS category_color, c.icon AS category_icon
     FROM budgets b LEFT JOIN categories c ON b.category_id = c.id
     ORDER BY b.created_at ASC`,
  );
}

export async function getBudget(id: string): Promise<Budget | null> {
  const db = await getDb();
  return db.getFirstAsync<Budget>('SELECT * FROM budgets WHERE id = ?', [id]);
}

export async function createBudget(input: BudgetInput): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO budgets (id, category_id, period, limit_amount, currency, created_at)
     VALUES (?, ?, 'monthly', ?, ?, ?)`,
    [id, input.category_id, input.limit_amount, input.currency, Date.now()],
  );
  return id;
}

export async function updateBudget(id: string, input: BudgetInput): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE budgets SET category_id = ?, limit_amount = ?, currency = ? WHERE id = ?', [
    input.category_id,
    input.limit_amount,
    input.currency,
    id,
  ]);
}

export async function deleteBudget(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
}
