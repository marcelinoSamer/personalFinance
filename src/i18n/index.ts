import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import { I18nManager } from 'react-native';

import en from './en';
import ar from './ar';

export type AppLocale = 'en' | 'ar';
export const SUPPORTED_LOCALES: AppLocale[] = ['en', 'ar'];

const i18n = new I18n({ en, ar });
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

export function deviceLocale(): AppLocale {
  const code = getLocales()[0]?.languageCode?.toLowerCase();
  return code === 'ar' ? 'ar' : 'en';
}

export function isRTLLocale(locale: AppLocale): boolean {
  return locale === 'ar';
}

let currentLocale: AppLocale = 'en';

export function getLocale(): AppLocale {
  return currentLocale;
}

/**
 * Apply a locale to the i18n engine and the RN layout direction.
 * Returns true when the RTL direction changed, which requires an app reload
 * for the new direction to fully take effect.
 */
export function applyLocale(locale: AppLocale): boolean {
  currentLocale = locale;
  i18n.locale = locale;
  const shouldBeRTL = isRTLLocale(locale);
  const changed = I18nManager.isRTL !== shouldBeRTL;
  if (changed) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
  }
  return changed;
}

/**
 * Translate a key with optional `{{var}}` interpolation. We post-process the
 * placeholders ourselves so translation strings stay framework-agnostic.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  let str = i18n.t(key);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
    }
  }
  return str;
}

export default i18n;
