import { getDb } from '../client';
import { newId } from '../id';
import type { PendingStatus, SmsLang, SmsPending, SmsSender, SmsTemplate } from '../schema';

// ---- Senders (allowlist) ----

export async function listSenders(): Promise<SmsSender[]> {
  const db = await getDb();
  return db.getAllAsync<SmsSender>('SELECT * FROM sms_senders ORDER BY created_at ASC');
}

export async function listEnabledSenders(): Promise<SmsSender[]> {
  const db = await getDb();
  return db.getAllAsync<SmsSender>('SELECT * FROM sms_senders WHERE enabled = 1');
}

export async function createSender(address: string, bankName?: string | null): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    'INSERT INTO sms_senders (id, address, bank_name, enabled, created_at) VALUES (?, ?, ?, 1, ?)',
    [id, address, bankName ?? null, Date.now()],
  );
  return id;
}

export async function setSenderEnabled(id: string, enabled: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE sms_senders SET enabled = ? WHERE id = ?', [enabled ? 1 : 0, id]);
}

export async function deleteSender(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM sms_senders WHERE id = ?', [id]);
}

// ---- Templates ----

export interface TemplateInput {
  sender_match: string;
  lang: SmsLang;
  pattern: string;
  field_map: string;
  direction_rule?: string | null;
  default_account_id?: string | null;
  learned?: boolean;
}

export async function listTemplates(): Promise<SmsTemplate[]> {
  const db = await getDb();
  return db.getAllAsync<SmsTemplate>('SELECT * FROM sms_templates ORDER BY created_at ASC');
}

export async function listEnabledTemplates(): Promise<SmsTemplate[]> {
  const db = await getDb();
  return db.getAllAsync<SmsTemplate>('SELECT * FROM sms_templates WHERE enabled = 1');
}

export async function createTemplate(input: TemplateInput): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO sms_templates (id, sender_match, lang, pattern, field_map, direction_rule, default_account_id, enabled, learned, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      id,
      input.sender_match,
      input.lang,
      input.pattern,
      input.field_map,
      input.direction_rule ?? null,
      input.default_account_id ?? null,
      input.learned ? 1 : 0,
      Date.now(),
    ],
  );
  return id;
}

export async function setTemplateEnabled(id: string, enabled: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE sms_templates SET enabled = ? WHERE id = ?', [enabled ? 1 : 0, id]);
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM sms_templates WHERE id = ?', [id]);
}

// ---- Pending review queue ----

export interface PendingInput {
  raw_body: string;
  sender: string;
  received_at: number;
  parsed_guess: string;
  confidence: number;
  dedup_hash: string;
}

export async function listPending(status: PendingStatus = 'pending'): Promise<SmsPending[]> {
  const db = await getDb();
  return db.getAllAsync<SmsPending>(
    'SELECT * FROM sms_pending WHERE status = ? ORDER BY received_at DESC',
    [status],
  );
}

export async function countPending(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    "SELECT COUNT(*) AS c FROM sms_pending WHERE status = 'pending'",
  );
  return row?.c ?? 0;
}

export async function insertPending(input: PendingInput): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO sms_pending (id, raw_body, sender, received_at, parsed_guess, confidence, status, dedup_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    [id, input.raw_body, input.sender, input.received_at, input.parsed_guess, input.confidence, input.dedup_hash, Date.now()],
  );
  return id;
}

export async function setPendingStatus(id: string, status: PendingStatus): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE sms_pending SET status = ? WHERE id = ?', [status, id]);
}

// ---- Dedup (seen) ----

export async function isSeen(hash: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ dedup_hash: string }>(
    'SELECT dedup_hash FROM sms_seen WHERE dedup_hash = ?',
    [hash],
  );
  return !!row;
}

export async function markSeen(hash: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR IGNORE INTO sms_seen (dedup_hash, created_at) VALUES (?, ?)', [
    hash,
    Date.now(),
  ]);
}
