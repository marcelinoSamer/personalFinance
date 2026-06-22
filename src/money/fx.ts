// Offline currency conversion using a user-maintained rate table.
// There is NO live rate feed (offline-first). Rates are entered by the user.

import type { CurrencyCode } from './currencies';

export interface FxRate {
  base: CurrencyCode;
  quote: CurrencyCode;
  /** 1 unit of `base` = `rate` units of `quote`. */
  rate: number;
  updatedAt: number;
}

export type RateLookup = (base: CurrencyCode, quote: CurrencyCode) => number | undefined;

/**
 * Build a fast lookup from a flat list of rates. Each rate is usable in both
 * directions (the inverse is derived automatically).
 */
export function buildRateLookup(rates: FxRate[]): RateLookup {
  const map = new Map<string, number>();
  for (const r of rates) {
    if (!r.rate || r.rate <= 0) continue;
    map.set(key(r.base, r.quote), r.rate);
    map.set(key(r.quote, r.base), 1 / r.rate);
  }
  return (base, quote) => (base === quote ? 1 : map.get(key(base, quote)));
}

function key(a: CurrencyCode, b: CurrencyCode): string {
  return `${a}>${b}`;
}

export interface ConvertResult {
  /** Converted amount, or null when no rate path is known. */
  value: number | null;
  /** The effective rate used (1 base = rate quote), if found. */
  rate: number | null;
  /** Currencies for which a rate is missing (for prompting the user). */
  missing?: { base: CurrencyCode; quote: CurrencyCode };
}

/**
 * Convert `amount` from `from` to `to`.
 * Tries a direct/inverse rate first, then pivots through `pivot` (the display
 * currency) so e.g. SAR->EGP works when only USD pairs are defined.
 */
export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  lookup: RateLookup,
  pivot?: CurrencyCode,
): ConvertResult {
  if (from === to) return { value: amount, rate: 1 };

  const direct = lookup(from, to);
  if (direct != null) return { value: amount * direct, rate: direct };

  if (pivot && pivot !== from && pivot !== to) {
    const a = lookup(from, pivot);
    const b = lookup(pivot, to);
    if (a != null && b != null) {
      const rate = a * b;
      return { value: amount * rate, rate };
    }
  }

  return { value: null, rate: null, missing: { base: from, quote: to } };
}

/**
 * Sum a list of {amount, currency} into `target`. Amounts that cannot be
 * converted are skipped and reported via `missing`.
 */
export function sumInCurrency(
  items: { amount: number; currency: CurrencyCode }[],
  target: CurrencyCode,
  lookup: RateLookup,
): { total: number; missing: CurrencyCode[] } {
  let total = 0;
  const missing = new Set<CurrencyCode>();
  for (const it of items) {
    const r = convert(it.amount, it.currency, target, lookup, target);
    if (r.value == null) missing.add(it.currency);
    else total += r.value;
  }
  return { total, missing: [...missing] };
}
