// Pure math for "Just this time" event boxes: an event-scoped budget the user
// funds beforehand (money moves into a closed box) and spends from during the
// event. All amounts here are in the box's own currency — the box's hidden
// account enforces that at the transaction level.

export type BoxPhase = 'upcoming' | 'active' | 'ended' | 'closed';

export interface BoxTimeLike {
  starts_at: number;
  ends_at: number;
  closed_at: number | null;
}

export function boxPhase(box: BoxTimeLike, now: number = Date.now()): BoxPhase {
  if (box.closed_at != null) return 'closed';
  if (now < box.starts_at) return 'upcoming';
  if (now > box.ends_at) return 'ended';
  return 'active';
}

export interface BoxMoney {
  /** The planned event budget. */
  budget: number;
  /** Everything put into the box (transfers in + income recorded on it). */
  funded: number;
  /** Expenses paid out of the box. */
  spent: number;
  /** Money moved back out of the box (leftover returns, incl. fees). */
  returned: number;
}

export interface BoxProgress extends BoxMoney {
  /** What is physically left inside the box. */
  inBox: number;
  /** Budget minus spend; negative when over budget. */
  remainingBudget: number;
  /** funded vs budget, in percent (uncapped). */
  fundedPercent: number;
  /** spent vs budget, in percent (uncapped). */
  spentPercent: number;
}

export function boxProgress(m: BoxMoney): BoxProgress {
  const pct = (v: number) => (m.budget > 0 ? (v / m.budget) * 100 : 0);
  return {
    ...m,
    inBox: m.funded - m.spent - m.returned,
    remainingBudget: m.budget - m.spent,
    fundedPercent: pct(m.funded),
    spentPercent: pct(m.spent),
  };
}

export type BoxVerdict = 'underBudget' | 'nearBudget' | 'overBudget' | 'farOverBudget';

/** How the event went: comfortably under (≤90%), on budget, over (≤120%), blown. */
export function boxVerdict(budget: number, spent: number): BoxVerdict {
  if (budget <= 0) return 'nearBudget';
  const ratio = spent / budget;
  if (ratio <= 0.9) return 'underBudget';
  if (ratio <= 1) return 'nearBudget';
  if (ratio <= 1.2) return 'overBudget';
  return 'farOverBudget';
}

export interface BoxTxLike {
  kind: 'income' | 'expense';
  amount: number;
  occurred_at: number;
  category_id: string | null;
  merchant: string | null;
}

export interface DayTotal {
  /** Start-of-day timestamp (local time). */
  day: number;
  total: number;
}

export interface ShareTotal<K> {
  key: K;
  total: number;
  /** 0..100 share of the spent total. */
  share: number;
}

export interface BoxReport {
  spent: number;
  verdict: BoxVerdict;
  /** budget - spent; positive = saved, negative = overspent. */
  delta: number;
  /** Calendar days the event spans (inclusive). */
  eventDays: number;
  /** Days already elapsed (1..eventDays); equals eventDays once ended. */
  elapsedDays: number;
  /** One entry per event day (zero-filled), for the daily chart. */
  days: DayTotal[];
  /** Spend during the event divided by elapsed days. */
  avgPerDay: number;
  /** budget / eventDays. */
  plannedPerDay: number;
  peakDay: DayTotal | null;
  /** Box expenses dated before/after the event window (bookings, stragglers). */
  preEventSpent: number;
  postEventSpent: number;
  byCategory: ShareTotal<string | null>[];
  byMerchant: ShareTotal<string>[];
  txCount: number;
}

function dayStart(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function nextDay(day: number): number {
  const d = new Date(day);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
}

export interface BoxReportInput {
  budget_amount: number;
  starts_at: number;
  ends_at: number;
}

export function buildBoxReport(
  box: BoxReportInput,
  txs: BoxTxLike[],
  now: number = Date.now(),
): BoxReport {
  const expenses = txs.filter((t) => t.kind === 'expense');
  const spent = expenses.reduce((s, t) => s + t.amount, 0);

  const firstDay = dayStart(box.starts_at);
  const lastDay = dayStart(box.ends_at);

  // Zero-filled event days, then bucket spending into them (or pre/post).
  const days: DayTotal[] = [];
  const index = new Map<number, DayTotal>();
  for (let d = firstDay; d <= lastDay; d = nextDay(d)) {
    const entry = { day: d, total: 0 };
    days.push(entry);
    index.set(d, entry);
  }

  let preEventSpent = 0;
  let postEventSpent = 0;
  let duringSpent = 0;
  for (const t of expenses) {
    const d = dayStart(t.occurred_at);
    const entry = index.get(d);
    if (entry) {
      entry.total += t.amount;
      duringSpent += t.amount;
    } else if (d < firstDay) {
      preEventSpent += t.amount;
    } else {
      postEventSpent += t.amount;
    }
  }

  const eventDays = days.length;
  const elapsedDays =
    now > box.ends_at ? eventDays : Math.max(1, days.filter((d) => d.day <= now).length);

  let peakDay: DayTotal | null = null;
  for (const d of days) {
    if (d.total > 0 && (peakDay == null || d.total > peakDay.total)) peakDay = d;
  }

  const share = (v: number) => (spent > 0 ? (v / spent) * 100 : 0);

  const catTotals = new Map<string | null, number>();
  for (const t of expenses) {
    catTotals.set(t.category_id, (catTotals.get(t.category_id) ?? 0) + t.amount);
  }
  const byCategory = [...catTotals.entries()]
    .map(([key, total]) => ({ key, total, share: share(total) }))
    .sort((a, b) => b.total - a.total);

  const merchTotals = new Map<string, number>();
  for (const t of expenses) {
    if (!t.merchant) continue;
    merchTotals.set(t.merchant, (merchTotals.get(t.merchant) ?? 0) + t.amount);
  }
  const byMerchant = [...merchTotals.entries()]
    .map(([key, total]) => ({ key, total, share: share(total) }))
    .sort((a, b) => b.total - a.total);

  return {
    spent,
    verdict: boxVerdict(box.budget_amount, spent),
    delta: box.budget_amount - spent,
    eventDays,
    elapsedDays,
    days,
    avgPerDay: duringSpent / Math.max(1, elapsedDays),
    plannedPerDay: box.budget_amount / Math.max(1, eventDays),
    peakDay,
    preEventSpent,
    postEventSpent,
    byCategory,
    byMerchant,
    txCount: expenses.length,
  };
}
