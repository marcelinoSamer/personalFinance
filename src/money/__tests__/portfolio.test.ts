import { buildRateLookup, type FxRate } from '../fx';
import { computeNetWorth } from '../portfolio';

const rates: FxRate[] = [{ base: 'USD', quote: 'EGP', rate: 50, updatedAt: 0 }];
const lookup = buildRateLookup(rates);

describe('computeNetWorth', () => {
  it('converts cash and assets into the display currency', () => {
    const nw = computeNetWorth(
      [
        { amount: 100, currency: 'EGP' },
        { amount: 2, currency: 'USD' }, // -> 100 EGP
      ],
      [{ amount: 500, currency: 'EGP' }],
      'EGP',
      lookup,
    );
    expect(nw.cash).toBe(200);
    expect(nw.assets).toBe(500);
    expect(nw.total).toBe(700);
    expect(nw.missing).toEqual([]);
  });

  it('reports currencies with no known rate as missing', () => {
    const nw = computeNetWorth(
      [{ amount: 1, currency: 'GBP' }],
      [{ amount: 1, currency: 'XAU' }],
      'EGP',
      lookup,
    );
    expect(nw.total).toBe(0);
    expect(nw.missing.sort()).toEqual(['GBP', 'XAU']);
  });
});
