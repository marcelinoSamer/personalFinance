import { buildRateLookup, type FxRate } from '../fx';
import { computeBudgetStatuses, type BudgetLike, type ExpenseRow } from '../budgets';

const rates: FxRate[] = [{ base: 'USD', quote: 'EGP', rate: 50, updatedAt: 0 }];
const lookup = buildRateLookup(rates);

const budgets: BudgetLike[] = [
  { id: 'b1', category_id: 'cat_food', limit_amount: 1000, currency: 'EGP' },
  { id: 'b2', category_id: null, limit_amount: 5000, currency: 'EGP' }, // overall
];

const rows: ExpenseRow[] = [
  { category_id: 'cat_food', currency: 'EGP', total: 600 },
  { category_id: 'cat_food', currency: 'USD', total: 10 }, // -> 500 EGP
  { category_id: 'cat_transport', currency: 'EGP', total: 300 },
];

describe('computeBudgetStatuses', () => {
  it('limits a category budget to its category and converts currencies', () => {
    const [food] = computeBudgetStatuses(budgets, rows, lookup);
    expect(food.spent).toBe(1100); // 600 + 500
    expect(food.over).toBe(true);
    expect(food.percent).toBeCloseTo(110);
  });

  it('sums everything for an overall budget', () => {
    const [, overall] = computeBudgetStatuses(budgets, rows, lookup);
    expect(overall.spent).toBe(1400); // 600 + 500 + 300
    expect(overall.over).toBe(false);
  });

  it('flags missing rates', () => {
    const [food] = computeBudgetStatuses(
      budgets,
      [{ category_id: 'cat_food', currency: 'GBP', total: 5 }],
      lookup,
    );
    expect(food.missing).toBe(true);
  });
});
