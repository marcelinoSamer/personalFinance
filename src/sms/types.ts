import type { CurrencyCode } from '@/money/currencies';

export type Direction = 'in' | 'out';
export type SmsLanguage = 'en' | 'ar' | 'mixed';

export interface ParsedSms {
  direction: Direction | null;
  amount: number | null;
  currency: CurrencyCode | null;
  merchant: string | null;
  balance: number | null;
  /** Transaction time parsed from the body, else null (caller uses received time). */
  occurredAt: number | null;
  /** 0..1 — how confident the parse is. */
  confidence: number;
  language: SmsLanguage;
  matchedTemplateId?: string;
}

/** A raw SMS as read from the device inbox. */
export interface RawSms {
  address: string;
  body: string;
  date: number; // epoch ms received
}
