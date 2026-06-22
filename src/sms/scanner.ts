import { PermissionsAndroid, Platform } from 'react-native';

import { parseSms } from './parser';
import { senderMatches } from './templates';
import { dedupHash } from './dedup';
import type { RawSms } from './types';
import {
  insertPending,
  isSeen,
  listEnabledSenders,
  listEnabledTemplates,
  markSeen,
} from '@/db/repositories/sms';
import { getSetting, setSetting } from '@/db/repositories/settings';

const LAST_SCAN_KEY = 'last_sms_scan';
const FIRST_SCAN_MAX = 300;

export function smsSupported(): boolean {
  return Platform.OS === 'android';
}

export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
    title: 'Read bank SMS',
    message: 'This app reads bank messages locally to record transactions. Nothing is uploaded.',
    buttonPositive: 'Allow',
    buttonNegative: 'Deny',
  });
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

interface InboxFilter {
  minDate?: number;
  maxCount?: number;
  address?: string;
}

function readInbox(opts: InboxFilter = {}): Promise<RawSms[]> {
  // Lazy require so the Android-only native module is never loaded on iOS.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('react-native-get-sms-android');
  const SmsAndroid = mod.default ?? mod;
  const filter: Record<string, unknown> = { box: 'inbox' };
  if (opts.minDate) filter.minDate = opts.minDate;
  if (opts.maxCount) filter.maxCount = opts.maxCount;
  if (opts.address) filter.address = opts.address;

  return new Promise<RawSms[]>((resolve, reject) => {
    SmsAndroid.list(
      JSON.stringify(filter),
      (err: string) => reject(new Error(err || 'sms list failed')),
      (_count: number, smsList: string) => {
        try {
          const arr = JSON.parse(smsList) as { address?: string; body?: string; date?: number }[];
          resolve(
            arr.map((m) => ({
              address: String(m.address ?? ''),
              body: String(m.body ?? ''),
              date: Number(m.date ?? Date.now()),
            })),
          );
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      },
    );
  });
}

export interface ScanResult {
  scanned: number;
  enqueued: number;
  noSenders?: boolean;
}

/**
 * Scans the SMS inbox for messages from allowlisted bank senders, parses them,
 * deduplicates, and adds new ones to the review queue. Android only.
 */
export async function scanAndEnqueue(): Promise<ScanResult> {
  if (Platform.OS !== 'android') return { scanned: 0, enqueued: 0 };

  const granted = await requestSmsPermission();
  if (!granted) throw new Error('permission-denied');

  const senders = await listEnabledSenders();
  if (senders.length === 0) return { scanned: 0, enqueued: 0, noSenders: true };

  const lastScan = Number((await getSetting(LAST_SCAN_KEY)) ?? '0');
  const templates = await listEnabledTemplates();

  const messages = await readInbox(lastScan > 0 ? { minDate: lastScan + 1 } : { maxCount: FIRST_SCAN_MAX });

  let enqueued = 0;
  for (const m of messages) {
    if (!senders.some((s) => senderMatches(s.address, m.address))) continue;
    const hash = dedupHash(m.address, m.body);
    if (await isSeen(hash)) continue;

    const parsed = parseSms(m.body, m.address, templates);
    await insertPending({
      raw_body: m.body,
      sender: m.address,
      received_at: m.date,
      parsed_guess: JSON.stringify(parsed),
      confidence: parsed.confidence,
      dedup_hash: hash,
    });
    await markSeen(hash);
    enqueued++;
  }

  await setSetting(LAST_SCAN_KEY, String(Date.now()));
  return { scanned: messages.length, enqueued };
}
