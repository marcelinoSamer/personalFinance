import { getDb } from '../client';
import { newId } from '../id';
import type { Goal } from '../schema';
import type { CurrencyCode } from '@/money/currencies';

export interface GoalInput {
  name: string;
  target_amount: number;
  currency: CurrencyCode;
  target_date: number | null;
  linked_account_id: string | null;
  note: string | null;
}

export async function listGoals(): Promise<Goal[]> {
  const db = await getDb();
  return db.getAllAsync<Goal>('SELECT * FROM goals ORDER BY created_at ASC');
}

export async function getGoal(id: string): Promise<Goal | null> {
  const db = await getDb();
  return db.getFirstAsync<Goal>('SELECT * FROM goals WHERE id = ?', [id]);
}

export async function createGoal(input: GoalInput): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO goals (id, name, target_amount, currency, target_date, linked_account_id, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name,
      input.target_amount,
      input.currency,
      input.target_date,
      input.linked_account_id,
      input.note,
      Date.now(),
    ],
  );
  return id;
}

export async function updateGoal(id: string, input: GoalInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE goals SET name = ?, target_amount = ?, currency = ?, target_date = ?, linked_account_id = ?, note = ? WHERE id = ?`,
    [
      input.name,
      input.target_amount,
      input.currency,
      input.target_date,
      input.linked_account_id,
      input.note,
      id,
    ],
  );
}

export async function deleteGoal(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM goals WHERE id = ?', [id]);
}
