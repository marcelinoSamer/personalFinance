// Static currency metadata. The app is fully offline, so this list is bundled.
// `XAU` (gold, troy ounce) and `XAG` (silver) are included for asset valuation.

export type CurrencyCode = string;

export interface CurrencyMeta {
  code: CurrencyCode;
  /** Display symbol in Latin / English context. */
  symbol: string;
  /** Display symbol in Arabic context (falls back to `symbol`). */
  symbolAr?: string;
  nameEn: string;
  nameAr: string;
  /** Number of fraction digits used when formatting. */
  decimals: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  EGP: { code: 'EGP', symbol: 'E£', symbolAr: 'ج.م', nameEn: 'Egyptian Pound', nameAr: 'جنيه مصري', decimals: 2 },
  USD: { code: 'USD', symbol: '$', nameEn: 'US Dollar', nameAr: 'دولار أمريكي', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', nameEn: 'Euro', nameAr: 'يورو', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', nameEn: 'British Pound', nameAr: 'جنيه إسترليني', decimals: 2 },
  SAR: { code: 'SAR', symbol: 'SR', symbolAr: 'ر.س', nameEn: 'Saudi Riyal', nameAr: 'ريال سعودي', decimals: 2 },
  AED: { code: 'AED', symbol: 'AED', symbolAr: 'د.إ', nameEn: 'UAE Dirham', nameAr: 'درهم إماراتي', decimals: 2 },
  KWD: { code: 'KWD', symbol: 'KD', symbolAr: 'د.ك', nameEn: 'Kuwaiti Dinar', nameAr: 'دينار كويتي', decimals: 3 },
  QAR: { code: 'QAR', symbol: 'QR', symbolAr: 'ر.ق', nameEn: 'Qatari Riyal', nameAr: 'ريال قطري', decimals: 2 },
  JOD: { code: 'JOD', symbol: 'JD', symbolAr: 'د.أ', nameEn: 'Jordanian Dinar', nameAr: 'دينار أردني', decimals: 3 },
  BHD: { code: 'BHD', symbol: 'BD', symbolAr: 'د.ب', nameEn: 'Bahraini Dinar', nameAr: 'دينار بحريني', decimals: 3 },
  OMR: { code: 'OMR', symbol: 'OR', symbolAr: 'ر.ع', nameEn: 'Omani Rial', nameAr: 'ريال عماني', decimals: 3 },
  XAU: { code: 'XAU', symbol: 'oz Au', symbolAr: 'أونصة ذهب', nameEn: 'Gold (troy oz)', nameAr: 'ذهب (أونصة)', decimals: 4 },
  XAG: { code: 'XAG', symbol: 'oz Ag', symbolAr: 'أونصة فضة', nameEn: 'Silver (troy oz)', nameAr: 'فضة (أونصة)', decimals: 4 },
};

export const DEFAULT_CURRENCY: CurrencyCode = 'EGP';

/** Currencies offered for cash containers/transactions (excludes metals). */
export const CASH_CURRENCY_CODES: CurrencyCode[] = [
  'EGP', 'USD', 'EUR', 'GBP', 'SAR', 'AED', 'KWD', 'QAR', 'JOD', 'BHD', 'OMR',
];

export function currencyMeta(code: CurrencyCode): CurrencyMeta {
  return (
    CURRENCIES[code] ?? {
      code,
      symbol: code,
      nameEn: code,
      nameAr: code,
      decimals: 2,
    }
  );
}

export function currencyDecimals(code: CurrencyCode): number {
  return currencyMeta(code).decimals;
}
