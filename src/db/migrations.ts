import type { SQLiteDatabase } from 'expo-sqlite';

import { DEFAULT_CURRENCY } from '@/money/currencies';

type Migration = (db: SQLiteDatabase) => Promise<void>;

const DDL_V1 = `
CREATE TABLE accounts (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  currency TEXT NOT NULL,
  opening_balance REAL NOT NULL DEFAULT 0,
  icon TEXT,
  color TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  merchant TEXT,
  note TEXT,
  occurred_at INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  sms_ref TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_tx_account ON transactions(account_id);
CREATE INDEX idx_tx_occurred ON transactions(occurred_at);
CREATE INDEX idx_tx_category ON transactions(category_id);

CREATE TABLE transfers (
  id TEXT PRIMARY KEY NOT NULL,
  from_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  to_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  from_amount REAL NOT NULL,
  to_amount REAL NOT NULL,
  rate REAL NOT NULL DEFAULT 1,
  fee REAL NOT NULL DEFAULT 0,
  fee_currency TEXT,
  occurred_at INTEGER NOT NULL,
  note TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_transfer_occurred ON transfers(occurred_at);

CREATE TABLE assets (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit TEXT,
  value REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL,
  valued_at INTEGER NOT NULL,
  note TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE fx_rates (
  base TEXT NOT NULL,
  quote TEXT NOT NULL,
  rate REAL NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (base, quote)
);

CREATE TABLE budgets (
  id TEXT PRIMARY KEY NOT NULL,
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  period TEXT NOT NULL DEFAULT 'monthly',
  limit_amount REAL NOT NULL,
  currency TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE goals (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL,
  currency TEXT NOT NULL,
  target_date INTEGER,
  linked_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  note TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE sms_senders (
  id TEXT PRIMARY KEY NOT NULL,
  address TEXT NOT NULL,
  bank_name TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE sms_templates (
  id TEXT PRIMARY KEY NOT NULL,
  sender_match TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'auto',
  pattern TEXT NOT NULL,
  field_map TEXT NOT NULL,
  direction_rule TEXT,
  default_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  learned INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE sms_pending (
  id TEXT PRIMARY KEY NOT NULL,
  raw_body TEXT NOT NULL,
  sender TEXT NOT NULL,
  received_at INTEGER NOT NULL,
  parsed_guess TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  dedup_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_pending_status ON sms_pending(status);

CREATE TABLE sms_seen (
  dedup_hash TEXT PRIMARY KEY NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

interface SeedCategory {
  id: string;
  name: string;
  kind: 'income' | 'expense';
  icon: string;
  color: string;
}

const DEFAULT_CATEGORIES: SeedCategory[] = [
  { id: 'cat_food', name: 'Food & Dining', kind: 'expense', icon: 'food', color: '#FF7043' },
  { id: 'cat_groceries', name: 'Groceries', kind: 'expense', icon: 'cart', color: '#66BB6A' },
  { id: 'cat_transport', name: 'Transport', kind: 'expense', icon: 'car', color: '#42A5F5' },
  { id: 'cat_bills', name: 'Bills & Utilities', kind: 'expense', icon: 'file-document', color: '#AB47BC' },
  { id: 'cat_rent', name: 'Rent & Housing', kind: 'expense', icon: 'home-city', color: '#8D6E63' },
  { id: 'cat_shopping', name: 'Shopping', kind: 'expense', icon: 'shopping', color: '#EC407A' },
  { id: 'cat_health', name: 'Health', kind: 'expense', icon: 'medical-bag', color: '#EF5350' },
  { id: 'cat_entertainment', name: 'Entertainment', kind: 'expense', icon: 'movie', color: '#7E57C2' },
  { id: 'cat_education', name: 'Education', kind: 'expense', icon: 'school', color: '#26A69A' },
  { id: 'cat_expense_other', name: 'Other', kind: 'expense', icon: 'dots-horizontal', color: '#78909C' },
  { id: 'cat_salary', name: 'Salary', kind: 'income', icon: 'cash', color: '#43A047' },
  { id: 'cat_business', name: 'Business', kind: 'income', icon: 'briefcase', color: '#1E88E5' },
  { id: 'cat_gift', name: 'Gift', kind: 'income', icon: 'gift', color: '#D81B60' },
  { id: 'cat_investment', name: 'Investment', kind: 'income', icon: 'chart-line', color: '#00897B' },
  { id: 'cat_income_other', name: 'Other', kind: 'income', icon: 'dots-horizontal', color: '#78909C' },
];

const migration1: Migration = async (db) => {
  await db.execAsync(DDL_V1);
  let order = 0;
  for (const c of DEFAULT_CATEGORIES) {
    await db.runAsync(
      `INSERT INTO categories (id, name, kind, icon, color, parent_id, sort_order, is_default)
       VALUES (?, ?, ?, ?, ?, NULL, ?, 1)`,
      [c.id, c.name, c.kind, c.icon, c.color, order++],
    );
  }
};

// v2: seed a default "Net Cash" container so the app is usable immediately,
// without forcing the user to create an account first. Only seeds when the
// accounts table is empty, so existing users (and re-runs) are never affected.
export const DEFAULT_ACCOUNT_ID = 'acc_net_cash';

const migration2: Migration = async (db) => {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM accounts');
  if ((row?.n ?? 0) > 0) return;
  await db.runAsync(
    `INSERT INTO accounts (id, name, type, currency, opening_balance, icon, color, archived, sort_order, created_at)
     VALUES (?, 'Net Cash', 'cash', ?, 0, 'cash', '#0F766E', 0, 0, ?)`,
    [DEFAULT_ACCOUNT_ID, DEFAULT_CURRENCY, Date.now()],
  );
};

// v3: "Just this time" event boxes. Each box owns a hidden account of type
// 'box', so funding (transfers in) and event spending (expense transactions)
// reuse the existing balance machinery; this table holds the event metadata.
const migration3: Migration = async (db) => {
  await db.execAsync(`
CREATE TABLE event_boxes (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  budget_amount REAL NOT NULL,
  currency TEXT NOT NULL,
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  color TEXT,
  note TEXT,
  closed_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_event_boxes_account ON event_boxes(account_id);
`);
};

// Append future migrations here; index in the array == target user_version.
const migrations: Migration[] = [migration1, migration2, migration3];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current; v < migrations.length; v++) {
    await db.withTransactionAsync(async () => {
      await migrations[v](db);
    });
    // PRAGMA user_version cannot be parameterized; v+1 is an integer we control.
    await db.execAsync(`PRAGMA user_version = ${v + 1};`);
  }
}
