// Deterministic, offline money/number formatting.
// We avoid relying on Intl (inconsistent across Hermes builds) and format manually.

import { currencyMeta, type CurrencyCode } from './currencies';

const ARABIC_INDIC = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

function toArabicDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => ARABIC_INDIC[Number(d)]);
}

export interface FormatOptions {
  /** When true, render digits as Arabic-Indic numerals. */
  arabicDigits?: boolean;
  /** Override fraction digits (defaults to the currency's decimals). */
  decimals?: number;
  /** Always show a leading +/- sign. */
  signed?: boolean;
}

/** Group the integer part with thousands separators. */
function groupInteger(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Format a raw number with grouping + fixed decimals (no currency). */
export function formatNumber(value: number, decimals = 2, opts: FormatOptions = {}): string {
  const neg = value < 0;
  const fixed = Math.abs(value).toFixed(decimals);
  const [intPart, fracPart] = fixed.split('.');
  let out = groupInteger(intPart);
  if (fracPart) out += '.' + fracPart;
  const sign = neg ? '-' : opts.signed ? '+' : '';
  out = sign + out;
  return opts.arabicDigits ? toArabicDigits(out) : out;
}

/**
 * Format an amount with its currency symbol.
 * Symbol is placed before the number for Latin and kept inline for Arabic.
 */
export function formatMoney(
  value: number,
  code: CurrencyCode,
  opts: FormatOptions = {},
): string {
  const meta = currencyMeta(code);
  const decimals = opts.decimals ?? meta.decimals;
  const num = formatNumber(value, decimals, opts);
  const symbol = opts.arabicDigits && meta.symbolAr ? meta.symbolAr : meta.symbol;
  return `${symbol} ${num}`;
}

/** Compact form for charts/large totals: 1.2K, 3.4M, 1.1B. */
export function formatCompact(value: number, opts: FormatOptions = {}): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  let out: string;
  if (abs >= 1_000_000_000) out = sign + (abs / 1_000_000_000).toFixed(1) + 'B';
  else if (abs >= 1_000_000) out = sign + (abs / 1_000_000).toFixed(1) + 'M';
  else if (abs >= 1_000) out = sign + (abs / 1_000).toFixed(1) + 'K';
  else out = formatNumber(value, 0);
  return opts.arabicDigits ? toArabicDigits(out) : out;
}

/** Round a value to the currency's natural precision. */
export function roundToCurrency(value: number, code: CurrencyCode): number {
  const d = currencyMeta(code).decimals;
  const f = Math.pow(10, d);
  return Math.round(value * f) / f;
}
