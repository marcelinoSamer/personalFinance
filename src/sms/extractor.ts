import { detectLanguage, normalizeDigits } from './normalize';
import type { Direction, ParsedSms } from './types';
import type { CurrencyCode } from '@/money/currencies';

// A money number: grouped (1,234.56) or plain (1234 / 1234.5).
const NUM = '([0-9]{1,3}(?:,[0-9]{3})+(?:\\.[0-9]+)?|[0-9]+(?:\\.[0-9]+)?)';

// Currency tokens (regex sources, no capturing groups). Order = priority.
const CURRENCY_TOKENS: { code: CurrencyCode; tokens: string[] }[] = [
  { code: 'EGP', tokens: ['EGP', 'E£', 'L\\.?E', 'جنيه', 'ج\\.?م'] },
  { code: 'USD', tokens: ['USD', '\\$', 'دولار'] },
  { code: 'EUR', tokens: ['EUR', '€', 'يورو'] },
  { code: 'GBP', tokens: ['GBP', '£', 'استرليني', 'إسترليني'] },
  { code: 'AED', tokens: ['AED', 'د\\.?إ', 'درهم'] },
  { code: 'KWD', tokens: ['KWD', 'د\\.?ك', 'دينار كويتي'] },
  { code: 'QAR', tokens: ['QAR', 'ر\\.?ق', 'ريال قطري'] },
  { code: 'JOD', tokens: ['JOD', 'د\\.?أ', 'دينار أردني'] },
  { code: 'BHD', tokens: ['BHD', 'د\\.?ب', 'دينار بحريني'] },
  { code: 'OMR', tokens: ['OMR', 'ر\\.?ع', 'ريال عماني'] },
  { code: 'SAR', tokens: ['SAR', 'SR', 'ر\\.?س', 'ريال سعودي', 'ريال'] },
];

const OUT_KEYWORDS = [
  'debited', 'debit', 'withdrawn', 'withdrawal', 'withdraw', 'purchase', 'spent',
  'payment', 'paid', 'deducted', 'charged', 'transfer to', 'sent to', 'pos',
  'خصم', 'مدين', 'سحب', 'شراء', 'دفع', 'مشتريات', 'مشترياتك', 'سداد', 'اقتطاع',
  'حوالة صادرة', 'تم خصم', 'مبلغ صادر',
];
const IN_KEYWORDS = [
  'credited', 'credit', 'deposited', 'deposit', 'received', 'refund', 'salary', 'added',
  'transfer from', 'received from',
  'إيداع', 'ايداع', 'دائن', 'إضافة', 'اضافة', 'استلام', 'راتب', 'حوالة واردة',
  'تم إضافة', 'أضيف', 'اضيف', 'مبلغ وارد',
];

function parseNum(s: string): number {
  return parseFloat(s.replace(/,/g, ''));
}

function countMatches(haystack: string, needles: string[]): number {
  let n = 0;
  for (const w of needles) if (haystack.includes(w)) n++;
  return n;
}

function extractAmountCurrency(
  text: string,
): { amount: number | null; currency: CurrencyCode | null; viaToken: boolean } {
  for (const { code, tokens } of CURRENCY_TOKENS) {
    for (const tok of tokens) {
      const after = new RegExp(tok + '\\s*' + NUM, 'i');
      let m = after.exec(text);
      if (m) return { amount: parseNum(m[1]), currency: code, viaToken: true };
      const before = new RegExp(NUM + '\\s*' + tok, 'i');
      m = before.exec(text);
      if (m) return { amount: parseNum(m[1]), currency: code, viaToken: true };
    }
  }
  // Fallback: pick the most money-like number in the message.
  const all = [...text.matchAll(new RegExp(NUM, 'g'))].map((m) => ({
    val: parseNum(m[1]),
    grouped: /[.,]/.test(m[1]),
  }));
  const pool = all.filter((n) => n.grouped);
  const chosen = (pool.length ? pool : all).sort((a, b) => b.val - a.val)[0];
  return { amount: chosen ? chosen.val : null, currency: null, viaToken: false };
}

function extractDirection(lower: string): Direction | null {
  const out = countMatches(lower, OUT_KEYWORDS);
  const inc = countMatches(lower, IN_KEYWORDS);
  if (out === 0 && inc === 0) return null;
  if (out >= inc) return 'out';
  return 'in';
}

const AR_MERCHANT_STOPWORDS = new Set([
  'حسابك', 'حساب', 'حسابكم', 'الرصيد', 'رصيد', 'بطاقتك', 'بطاقة', 'المتاح',
]);

function extractMerchant(text: string): string | null {
  // English: "at/to/from/for <merchant>" (merchant must start with a letter)
  const en = /\b(?:at|to|from|for)\s+([A-Za-z][A-Za-z0-9 &'-]{1,28})/i.exec(text);
  if (en) {
    const raw = en[1]
      .replace(/\s+(on|ref|your|with|using|via|account|acct|card|bal|balance)\b.*$/i, '')
      .trim();
    if (raw.length >= 2) return raw;
  }
  // Arabic: prefer location ("لدى"/"في"), then "إلى" (to). Skip generic words.
  const arPatterns = [
    /لدى\s+([^\d\n،.]{2,28})/,
    /\bفي\s+([^\d\n،.]{2,28})/,
    /إلى\s+([^\d\n،.]{2,28})/,
    /الى\s+([^\d\n،.]{2,28})/,
  ];
  for (const re of arPatterns) {
    const m = re.exec(text);
    if (m) {
      const v = m[1].trim();
      if (v.length >= 2 && !AR_MERCHANT_STOPWORDS.has(v.split(/\s+/)[0])) return v;
    }
  }
  return null;
}

function extractBalance(text: string): number | null {
  const m = /(?:balance|bal|available|avail|رصيد)[^0-9]{0,15}([0-9][0-9.,]*)/i.exec(text);
  return m ? parseNum(m[1]) : null;
}

function extractDate(text: string): number | null {
  const m = /\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/.exec(text);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day, 12, 0, 0, 0);
  return d.getMonth() === month - 1 ? d.getTime() : null;
}

/** Best-effort generic parse of a bank SMS (no template applied). */
export function extract(rawText: string): ParsedSms {
  const text = normalizeDigits(rawText);
  const lower = text.toLowerCase();

  const { amount, currency, viaToken } = extractAmountCurrency(text);
  const direction = extractDirection(lower);
  const merchant = extractMerchant(text);
  const balance = extractBalance(text);
  const occurredAt = extractDate(text);

  let confidence = 0;
  if (amount != null) confidence += viaToken ? 0.5 : 0.3;
  if (direction) confidence += 0.3;
  if (currency) confidence += 0.1;
  if (merchant) confidence += 0.1;
  if (balance != null) confidence += 0.05;
  confidence = Math.min(1, confidence);

  return {
    direction,
    amount,
    currency,
    merchant,
    balance,
    occurredAt,
    confidence,
    language: detectLanguage(rawText),
  };
}
