/** Strip everything except digits and a single decimal point. */
export function sanitizeDecimal(s: string): string {
  return s.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
}

/** Parse a user-entered amount string into a number (0 when empty/invalid). */
export function parseAmount(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
