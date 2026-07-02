import { getLocale, t } from '@/i18n';

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export function formatDate(ts: number): string {
  const d = new Date(ts);
  const months = getLocale() === 'ar' ? MONTHS_AR : MONTHS_EN;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export function startOfMonth(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0).getTime();
}

export function endOfMonth(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
}

export interface DateRange {
  from: number;
  to: number;
}

export function monthRange(ts: number = Date.now()): DateRange {
  return { from: startOfMonth(ts), to: endOfMonth(ts) };
}

/** Add `n` months to a timestamp (n can be negative). */
export function addMonths(ts: number, n: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate()).getTime();
}

export function monthLabel(ts: number): string {
  const d = new Date(ts);
  const months = getLocale() === 'ar' ? MONTHS_AR : MONTHS_EN;
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function shortMonth(ts: number): string {
  const d = new Date(ts);
  const months = getLocale() === 'ar' ? MONTHS_AR : MONTHS_EN;
  return months[d.getMonth()];
}

/** Bucket key for grouping by calendar day (local time). */
export function dayKey(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Human-readable day label: "Today" / "Yesterday" for recent days,
 * "23 Jun" for the current year, "23 Jun 2024" for older.
 */
export function formatDayHeader(ts: number): string {
  const now = Date.now();
  const today = dayKey(now);
  const target = dayKey(ts);
  if (target === today) return t('common.today');
  if (target === today - 86_400_000) return t('common.yesterday');
  const d = new Date(ts);
  const months = getLocale() === 'ar' ? MONTHS_AR : MONTHS_EN;
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return sameYear
    ? `${d.getDate()} ${months[d.getMonth()]}`
    : `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
