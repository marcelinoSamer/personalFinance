import { getDb } from '../client';
import type { FxRate } from '@/money/fx';
import type { CurrencyCode } from '@/money/currencies';

/** Returns rates shaped for `buildRateLookup`. */
export async function listRates(): Promise<FxRate[]> {
  const db = await getDb();
  return db.getAllAsync<FxRate>(
    'SELECT base, quote, rate, updated_at AS updatedAt FROM fx_rates ORDER BY base, quote',
  );
}

export async function upsertRate(
  base: CurrencyCode,
  quote: CurrencyCode,
  rate: number,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO fx_rates (base, quote, rate, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(base, quote) DO UPDATE SET rate = excluded.rate, updated_at = excluded.updated_at`,
    [base, quote, rate, Date.now()],
  );
}

export async function deleteRate(base: CurrencyCode, quote: CurrencyCode): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM fx_rates WHERE base = ? AND quote = ?', [base, quote]);
}
