import {
  boxPhase,
  boxProgress,
  boxVerdict,
  buildBoxReport,
  type BoxTxLike,
} from '../boxes';

function ts(y: number, m: number, d: number, h = 12): number {
  return new Date(y, m - 1, d, h, 0, 0, 0).getTime();
}

describe('boxPhase', () => {
  const box = { starts_at: ts(2026, 7, 10, 0), ends_at: ts(2026, 7, 14, 23), closed_at: null };

  it('is upcoming before the start', () => {
    expect(boxPhase(box, ts(2026, 7, 1))).toBe('upcoming');
  });

  it('is active during the event', () => {
    expect(boxPhase(box, ts(2026, 7, 10, 1))).toBe('active');
    expect(boxPhase(box, ts(2026, 7, 14, 12))).toBe('active');
  });

  it('is ended after the end', () => {
    expect(boxPhase(box, ts(2026, 7, 15))).toBe('ended');
  });

  it('is closed once settled, regardless of time', () => {
    expect(boxPhase({ ...box, closed_at: ts(2026, 7, 20) }, ts(2026, 7, 12))).toBe('closed');
  });
});

describe('boxProgress', () => {
  it('derives in-box balance and percents', () => {
    const p = boxProgress({ budget: 1000, funded: 800, spent: 300, returned: 100 });
    expect(p.inBox).toBe(400);
    expect(p.remainingBudget).toBe(700);
    expect(p.fundedPercent).toBe(80);
    expect(p.spentPercent).toBe(30);
  });

  it('handles a zero budget without dividing by zero', () => {
    const p = boxProgress({ budget: 0, funded: 50, spent: 10, returned: 0 });
    expect(p.fundedPercent).toBe(0);
    expect(p.spentPercent).toBe(0);
  });

  it('goes negative when overspent', () => {
    const p = boxProgress({ budget: 500, funded: 500, spent: 600, returned: 0 });
    expect(p.remainingBudget).toBe(-100);
    expect(p.spentPercent).toBe(120);
  });
});

describe('boxVerdict', () => {
  it('classifies spending against the budget', () => {
    expect(boxVerdict(1000, 850)).toBe('underBudget');
    expect(boxVerdict(1000, 900)).toBe('underBudget');
    expect(boxVerdict(1000, 1000)).toBe('nearBudget');
    expect(boxVerdict(1000, 1150)).toBe('overBudget');
    expect(boxVerdict(1000, 1500)).toBe('farOverBudget');
  });

  it('treats a zero budget as neutral', () => {
    expect(boxVerdict(0, 100)).toBe('nearBudget');
  });
});

describe('buildBoxReport', () => {
  // 5-day event: 10–14 July 2026.
  const box = {
    budget_amount: 1000,
    starts_at: ts(2026, 7, 10, 0),
    ends_at: ts(2026, 7, 14, 23),
  };

  const tx = (
    amount: number,
    when: number,
    category: string | null = null,
    merchant: string | null = null,
  ): BoxTxLike => ({ kind: 'expense', amount, occurred_at: when, category_id: category, merchant });

  it('zero-fills one bucket per event day', () => {
    const r = buildBoxReport(box, [], ts(2026, 7, 20));
    expect(r.days).toHaveLength(5);
    expect(r.days.every((d) => d.total === 0)).toBe(true);
    expect(r.spent).toBe(0);
    expect(r.peakDay).toBeNull();
  });

  it('buckets spending by day and finds the peak', () => {
    const r = buildBoxReport(
      box,
      [tx(100, ts(2026, 7, 10)), tx(50, ts(2026, 7, 10, 20)), tx(400, ts(2026, 7, 12))],
      ts(2026, 7, 20),
    );
    expect(r.spent).toBe(550);
    expect(r.days[0].total).toBe(150);
    expect(r.days[2].total).toBe(400);
    expect(r.peakDay?.total).toBe(400);
    expect(r.verdict).toBe('underBudget');
    expect(r.delta).toBe(450);
  });

  it('separates pre/post-event spending but counts it in the total', () => {
    const r = buildBoxReport(
      box,
      [tx(200, ts(2026, 7, 1)), tx(300, ts(2026, 7, 11)), tx(100, ts(2026, 7, 18))],
      ts(2026, 7, 20),
    );
    expect(r.preEventSpent).toBe(200);
    expect(r.postEventSpent).toBe(100);
    expect(r.spent).toBe(600);
    // Daily average only covers in-event spending.
    expect(r.avgPerDay).toBeCloseTo(300 / 5);
  });

  it('uses elapsed days for the average while the event runs', () => {
    // Two days in (10th + 11th), 300 spent during the event.
    const r = buildBoxReport(box, [tx(300, ts(2026, 7, 10))], ts(2026, 7, 11, 18));
    expect(r.elapsedDays).toBe(2);
    expect(r.eventDays).toBe(5);
    expect(r.avgPerDay).toBe(150);
    expect(r.plannedPerDay).toBe(200);
  });

  it('aggregates categories and merchants with shares', () => {
    const r = buildBoxReport(
      box,
      [
        tx(600, ts(2026, 7, 10), 'cat_food', 'Cafe A'),
        tx(300, ts(2026, 7, 11), 'cat_transport', 'Taxi'),
        tx(100, ts(2026, 7, 11), 'cat_food', 'Cafe A'),
      ],
      ts(2026, 7, 20),
    );
    expect(r.byCategory[0]).toEqual({ key: 'cat_food', total: 700, share: 70 });
    expect(r.byCategory[1]).toEqual({ key: 'cat_transport', total: 300, share: 30 });
    expect(r.byMerchant[0]).toEqual({ key: 'Cafe A', total: 700, share: 70 });
    expect(r.txCount).toBe(3);
  });

  it('ignores income entries (refunds handled as funding)', () => {
    const r = buildBoxReport(
      box,
      [
        tx(500, ts(2026, 7, 10)),
        { kind: 'income', amount: 200, occurred_at: ts(2026, 7, 11), category_id: null, merchant: null },
      ],
      ts(2026, 7, 20),
    );
    expect(r.spent).toBe(500);
    expect(r.txCount).toBe(1);
  });

  it('spans a single-day event', () => {
    const r = buildBoxReport(
      { budget_amount: 100, starts_at: ts(2026, 7, 10, 0), ends_at: ts(2026, 7, 10, 23) },
      [tx(80, ts(2026, 7, 10))],
      ts(2026, 7, 10, 22),
    );
    expect(r.eventDays).toBe(1);
    expect(r.elapsedDays).toBe(1);
    expect(r.days).toHaveLength(1);
    expect(r.avgPerDay).toBe(80);
  });
});
