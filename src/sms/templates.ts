import { normalizeDigits } from './normalize';
import type { ParsedSms } from './types';
import type { SmsTemplate } from '@/db/schema';
import type { CurrencyCode } from '@/money/currencies';

interface FieldMap {
  currency?: CurrencyCode;
  direction?: 'in' | 'out';
}

/** Whether a template's sender filter applies to a given sender address/label. */
export function senderMatches(senderMatch: string, sender: string): boolean {
  if (!senderMatch || senderMatch === '*') return true;
  const a = senderMatch.toLowerCase();
  const b = sender.toLowerCase();
  return a === b || b.includes(a) || a.includes(b);
}

function num(s: string): number {
  return parseFloat(s.replace(/,/g, ''));
}

/**
 * Applies a template on top of a generic parse. A template may:
 *  - provide a regex with named groups (amount/merchant/balance) to override fields
 *  - force currency and/or direction via its field_map JSON
 * Returns null if the template has a pattern that does not match.
 */
export function applyTemplate(
  parsed: ParsedSms,
  rawText: string,
  template: SmsTemplate,
): ParsedSms | null {
  const text = normalizeDigits(rawText);
  let { amount, merchant, balance } = parsed;

  if (template.pattern && template.pattern.trim()) {
    let re: RegExp;
    try {
      re = new RegExp(template.pattern, 'i');
    } catch {
      return null; // malformed pattern — skip
    }
    const m = re.exec(text);
    if (!m) return null;
    const g = (m.groups ?? {}) as Record<string, string | undefined>;
    if (g.amount) amount = num(g.amount);
    if (g.merchant) merchant = g.merchant.trim();
    if (g.balance) balance = num(g.balance);
  }

  let fm: FieldMap = {};
  try {
    fm = JSON.parse(template.field_map || '{}');
  } catch {
    fm = {};
  }

  return {
    ...parsed,
    amount,
    merchant,
    balance,
    currency: fm.currency ?? parsed.currency,
    direction: fm.direction ?? parsed.direction,
    confidence: Math.max(parsed.confidence, 0.85),
    matchedTemplateId: template.id,
  };
}
