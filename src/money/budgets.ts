import { convert, type RateLookup } from './fx';
import type { CurrencyCode } from './currencies';

export interface BudgetLike {
  id: string;
  category_id: string | null;
  limit_amount: number;
  currency: CurrencyCode;
}

export interface ExpenseRow {
  category_id: string | null;
  currency: CurrencyCode;
  total: number;
}

export interface BudgetStatus<B extends BudgetLike> {
  budget: B;
  /** Spent this period, converted into the budget's currency. */
  spent: number;
  percent: number;
  over: boolean;
  /** True if some expenses could not be converted (missing rate). */
  missing: boolean;
}

/**
 * Computes spent-vs-limit for each budget. A budget with a category matches
 * only that category's expenses; a budget with no category matches everything.
 */
export function computeBudgetStatuses<B extends BudgetLike>(
  budgets: B[],
  rows: ExpenseRow[],
  lookup: RateLookup,
): BudgetStatus<B>[] {
  return budgets.map((b) => {
    let spent = 0;
    let missing = false;
    for (const r of rows) {
      if (b.category_id && r.category_id !== b.category_id) continue;
      const c = convert(r.total, r.currency, b.currency, lookup, b.currency);
      if (c.value == null) missing = true;
      else spent += c.value;
    }
    const percent = b.limit_amount > 0 ? (spent / b.limit_amount) * 100 : 0;
    return { budget: b, spent, percent, over: spent > b.limit_amount, missing };
  });
}
