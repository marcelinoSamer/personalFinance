const MS_PER_MONTH = 30.44 * 24 * 60 * 60 * 1000;

export interface GoalProgress {
  saved: number;
  target: number;
  remaining: number;
  /** 0..100 */
  percent: number;
  reached: boolean;
  /** Amount/month needed to hit the target by `targetDate` (if provided). */
  monthlyNeeded: number | null;
  /** Estimated months to reach the goal at the given average saving rate. */
  etaMonths: number | null;
}

export interface GoalOptions {
  targetDate?: number | null;
  now?: number;
  /** Average amount saved per month, used to estimate ETA. */
  avgMonthlySaving?: number;
}

export function monthsBetween(from: number, to: number): number {
  return (to - from) / MS_PER_MONTH;
}

export function goalProgress(saved: number, target: number, opts: GoalOptions = {}): GoalProgress {
  const now = opts.now ?? Date.now();
  const remaining = Math.max(0, target - saved);
  const percent = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
  const reached = saved >= target && target > 0;

  let monthlyNeeded: number | null = null;
  if (opts.targetDate && !reached) {
    const monthsLeft = Math.max(1, Math.ceil(monthsBetween(now, opts.targetDate)));
    monthlyNeeded = remaining / monthsLeft;
  }

  let etaMonths: number | null = null;
  if (!reached && opts.avgMonthlySaving && opts.avgMonthlySaving > 0) {
    etaMonths = Math.ceil(remaining / opts.avgMonthlySaving);
  }

  return { saved, target, remaining, percent, reached, monthlyNeeded, etaMonths };
}
