import { formatNumber, formatMoney, formatCompact, roundToCurrency } from '../format';

describe('formatNumber', () => {
  it('groups thousands and fixes decimals', () => {
    expect(formatNumber(1234.5, 2)).toBe('1,234.50');
    expect(formatNumber(1000000, 0)).toBe('1,000,000');
    expect(formatNumber(0, 2)).toBe('0.00');
  });

  it('handles negatives and signed option', () => {
    expect(formatNumber(-50, 2)).toBe('-50.00');
    expect(formatNumber(50, 0, { signed: true })).toBe('+50');
  });

  it('renders Arabic-Indic digits when requested', () => {
    expect(formatNumber(123, 0, { arabicDigits: true })).toBe('١٢٣');
  });
});

describe('formatMoney', () => {
  it('prepends the currency symbol', () => {
    expect(formatMoney(1234.5, 'USD')).toBe('$ 1,234.50');
    expect(formatMoney(1000, 'EGP')).toBe('E£ 1,000.00');
  });

  it('respects currency decimals (KWD has 3)', () => {
    expect(formatMoney(1.2, 'KWD')).toBe('KD 1.200');
  });

  it('uses the Arabic symbol with Arabic digits', () => {
    expect(formatMoney(50, 'EGP', { arabicDigits: true })).toBe('ج.م ٥٠.٠٠');
  });
});

describe('formatCompact', () => {
  it('abbreviates large numbers', () => {
    expect(formatCompact(1500)).toBe('1.5K');
    expect(formatCompact(2_300_000)).toBe('2.3M');
    expect(formatCompact(-4_000_000_000)).toBe('-4.0B');
    expect(formatCompact(500)).toBe('500');
  });
});

describe('roundToCurrency', () => {
  it('rounds to the currency precision', () => {
    expect(roundToCurrency(1.2345, 'USD')).toBe(1.23);
    expect(roundToCurrency(1.2345, 'KWD')).toBe(1.235);
    expect(roundToCurrency(2.5, 'JPY' /* unknown -> 2 decimals */)).toBe(2.5);
  });
});
