import { goalProgress, monthsBetween } from '../planning';

const MONTH = 30.44 * 24 * 60 * 60 * 1000;

describe('goalProgress', () => {
  it('computes remaining and percent', () => {
    const p = goalProgress(250, 1000);
    expect(p.remaining).toBe(750);
    expect(p.percent).toBe(25);
    expect(p.reached).toBe(false);
  });

  it('caps percent at 100 and flags reached', () => {
    const p = goalProgress(1200, 1000);
    expect(p.percent).toBe(100);
    expect(p.reached).toBe(true);
    expect(p.remaining).toBe(0);
  });

  it('derives monthly amount needed for a target date', () => {
    const now = 0;
    const p = goalProgress(0, 1000, { targetDate: 4 * MONTH, now });
    expect(p.monthlyNeeded).toBeCloseTo(250, 0);
  });

  it('estimates ETA from an average saving rate', () => {
    const p = goalProgress(0, 1000, { avgMonthlySaving: 300 });
    expect(p.etaMonths).toBe(4); // ceil(1000/300)
  });

  it('returns no projections once reached', () => {
    const p = goalProgress(1000, 1000, { targetDate: MONTH, avgMonthlySaving: 100 });
    expect(p.monthlyNeeded).toBeNull();
    expect(p.etaMonths).toBeNull();
  });
});

describe('monthsBetween', () => {
  it('measures elapsed months', () => {
    expect(monthsBetween(0, 3 * MONTH)).toBeCloseTo(3);
  });
});
