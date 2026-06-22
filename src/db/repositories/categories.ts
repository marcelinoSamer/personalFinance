import { getDb } from '../client';
import { newId } from '../id';
import type { Category, CategoryKind } from '../schema';

export interface CategoryInput {
  name: string;
  kind: CategoryKind;
  icon?: string | null;
  color?: string | null;
}

export async function listCategories(kind?: CategoryKind): Promise<Category[]> {
  const db = await getDb();
  if (kind) {
    return db.getAllAsync<Category>(
      'SELECT * FROM categories WHERE kind = ? ORDER BY sort_order ASC, name ASC',
      [kind],
    );
  }
  return db.getAllAsync<Category>('SELECT * FROM categories ORDER BY kind ASC, sort_order ASC');
}

export async function getCategory(id: string): Promise<Category | null> {
  const db = await getDb();
  return db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', [id]);
}

export async function createCategory(input: CategoryInput): Promise<string> {
  const db = await getDb();
  const id = newId();
  const row = await db.getFirstAsync<{ m: number | null }>(
    'SELECT MAX(sort_order) AS m FROM categories',
  );
  const order = (row?.m ?? -1) + 1;
  await db.runAsync(
    `INSERT INTO categories (id, name, kind, icon, color, parent_id, sort_order, is_default)
     VALUES (?, ?, ?, ?, ?, NULL, ?, 0)`,
    [id, input.name, input.kind, input.icon ?? null, input.color ?? null, order],
  );
  return id;
}

export async function updateCategory(id: string, input: CategoryInput): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE categories SET name = ?, kind = ?, icon = ?, color = ? WHERE id = ?', [
    input.name,
    input.kind,
    input.icon ?? null,
    input.color ?? null,
    id,
  ]);
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}
