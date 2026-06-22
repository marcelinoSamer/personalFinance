import type { CurrencyCode } from './currencies';
import { sumInCurrency, type RateLookup } from './fx';

export interface MoneyItem {
  amount: number;
  currency: CurrencyCode;
}

export interface NetWorth {
  /** Total of cash containers, in the display currency. */
  cash: number;
  /** Total of assets, in the display currency. */
  assets: number;
  total: number;
  /** Currencies that could not be converted (missing rates). */
  missing: CurrencyCode[];
}

/** Combine cash containers and assets into a net-worth figure. */
export function computeNetWorth(
  cashItems: MoneyItem[],
  assetItems: MoneyItem[],
  display: CurrencyCode,
  lookup: RateLookup,
): NetWorth {
  const cash = sumInCurrency(cashItems, display, lookup);
  const assets = sumInCurrency(assetItems, display, lookup);
  const missing = [...new Set([...cash.missing, ...assets.missing])];
  return {
    cash: cash.total,
    assets: assets.total,
    total: cash.total + assets.total,
    missing,
  };
}
