// TypeScript row types for the SQLite tables. Amounts are stored as REAL and
// rounded to currency precision at the edges (input/display).

import type { CurrencyCode } from '@/money/currencies';

export type AccountType = 'cash' | 'bank' | 'wallet' | 'savings';
export type TxKind = 'income' | 'expense';
export type TxSource = 'manual' | 'sms';
export type AssetType = 'gold' | 'stock' | 'crypto' | 'property' | 'other';
export type CategoryKind = 'income' | 'expense';
export type SmsLang = 'en' | 'ar' | 'auto';
export type PendingStatus = 'pending' | 'confirmed' | 'dismissed';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  opening_balance: number;
  icon: string | null;
  color: string | null;
  archived: number; // 0 | 1
  sort_order: number;
  created_at: number;
}

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: string | null;
  color: string | null;
  parent_id: string | null;
  sort_order: number;
  is_default: number; // 0 | 1
}

export interface Transaction {
  id: string;
  account_id: string;
  kind: TxKind;
  amount: number;
  currency: CurrencyCode;
  category_id: string | null;
  merchant: string | null;
  note: string | null;
  occurred_at: number;
  source: TxSource;
  sms_ref: string | null;
  created_at: number;
}

export interface Transfer {
  id: string;
  from_account_id: string;
  to_account_id: string;
  from_amount: number;
  to_amount: number;
  rate: number;
  fee: number;
  fee_currency: CurrencyCode | null;
  occurred_at: number;
  note: string | null;
  created_at: number;
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  quantity: number;
  unit: string | null;
  value: number; // total current value (quantity already factored in)
  currency: CurrencyCode;
  valued_at: number;
  note: string | null;
  created_at: number;
}

export interface FxRateRow {
  base: CurrencyCode;
  quote: CurrencyCode;
  rate: number;
  updated_at: number;
}

export interface Budget {
  id: string;
  category_id: string | null; // null = overall
  period: 'monthly';
  limit_amount: number;
  currency: CurrencyCode;
  created_at: number;
}

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  currency: CurrencyCode;
  target_date: number | null;
  linked_account_id: string | null;
  note: string | null;
  created_at: number;
}

export interface SmsSender {
  id: string;
  address: string;
  bank_name: string | null;
  enabled: number; // 0 | 1
  created_at: number;
}

export interface SmsTemplate {
  id: string;
  sender_match: string; // sender address/label this applies to ('*' = any)
  lang: SmsLang;
  pattern: string; // regex source
  field_map: string; // JSON: { amount, direction, merchant, balance, date }
  direction_rule: string | null; // JSON keyword overrides
  default_account_id: string | null;
  enabled: number;
  learned: number; // 0 | 1
  created_at: number;
}

export interface SmsPending {
  id: string;
  raw_body: string;
  sender: string;
  received_at: number;
  parsed_guess: string; // JSON of ParsedSms
  confidence: number;
  status: PendingStatus;
  dedup_hash: string;
  created_at: number;
}

export interface SettingRow {
  key: string;
  value: string;
}
