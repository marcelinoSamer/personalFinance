import { buildRateLookup, convert, sumInCurrency, type FxRate } from '../fx';

const rates: FxRate[] = [
  { base: 'USD', quote: 'EGP', rate: 50, updatedAt: 0 },
  { base: 'EUR', quote: 'USD', rate: 1.1, updatedAt: 0 },
];

const lookup = buildRateLookup(rates);

describe('convert', () => {
  it('returns the amount unchanged for same currency', () => {
    expect(convert(100, 'EGP', 'EGP', lookup)).toEqual({ value: 100, rate: 1 });
  });

  it('uses a direct rate', () => {
    const r = convert(2, 'USD', 'EGP', lookup);
    expect(r.value).toBe(100);
    expect(r.rate).toBe(50);
  });

  it('uses the inverse of a defined rate', () => {
    const r = convert(100, 'EGP', 'USD', lookup);
    expect(r.value).toBeCloseTo(2);
    expect(r.rate).toBeCloseTo(1 / 50);
  });

  it('pivots through the display currency when no direct rate exists', () => {
    // EUR -> EGP via USD pivot: 1.1 * 50 = 55
    const r = convert(1, 'EUR', 'EGP', lookup, 'USD');
    expect(r.value).toBeCloseTo(55);
    expect(r.rate).toBeCloseTo(55);
  });

  it('reports missing when no path is known', () => {
    const r = convert(1, 'GBP', 'EGP', lookup, 'USD');
    expect(r.value).toBeNull();
    expect(r.missing).toEqual({ base: 'GBP', quote: 'EGP' });
  });
});

describe('sumInCurrency', () => {
  it('sums convertible items and lists the missing currencies', () => {
    const res = sumInCurrency(
      [
        { amount: 100, currency: 'EGP' },
        { amount: 2, currency: 'USD' }, // -> 100 EGP
        { amount: 5, currency: 'GBP' }, // no rate
      ],
      'EGP',
      lookup,
    );
    expect(res.total).toBe(200);
    expect(res.missing).toEqual(['GBP']);
  });
});
