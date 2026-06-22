import { create } from 'zustand';

import { getAllSettings, setSetting } from '@/db/repositories/settings';
import { DEFAULT_CURRENCY, type CurrencyCode } from '@/money/currencies';
import { applyLocale, deviceLocale, type AppLocale } from '@/i18n';

export type ThemeMode = 'system' | 'light' | 'dark';

const KEYS = {
  displayCurrency: 'display_currency',
  locale: 'locale',
  themeMode: 'theme_mode',
  lockEnabled: 'lock_enabled',
} as const;

interface SettingsState {
  loaded: boolean;
  displayCurrency: CurrencyCode;
  locale: AppLocale;
  themeMode: ThemeMode;
  lockEnabled: boolean;
  load: () => Promise<void>;
  setDisplayCurrency: (code: CurrencyCode) => Promise<void>;
  /** Returns true when the RTL direction changed (caller should reload). */
  setLocale: (locale: AppLocale) => Promise<boolean>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setLockEnabled: (enabled: boolean) => Promise<void>;
}

export const useSettings = create<SettingsState>((set) => ({
  loaded: false,
  displayCurrency: DEFAULT_CURRENCY,
  locale: 'en',
  themeMode: 'system',
  lockEnabled: false,

  load: async () => {
    const s = await getAllSettings();
    const locale = (s[KEYS.locale] as AppLocale) || deviceLocale();
    applyLocale(locale);
    set({
      loaded: true,
      displayCurrency: s[KEYS.displayCurrency] || DEFAULT_CURRENCY,
      locale,
      themeMode: (s[KEYS.themeMode] as ThemeMode) || 'system',
      lockEnabled: s[KEYS.lockEnabled] === '1',
    });
  },

  setDisplayCurrency: async (code) => {
    await setSetting(KEYS.displayCurrency, code);
    set({ displayCurrency: code });
  },

  setLocale: async (locale) => {
    await setSetting(KEYS.locale, locale);
    const changed = applyLocale(locale);
    set({ locale });
    return changed;
  },

  setThemeMode: async (mode) => {
    await setSetting(KEYS.themeMode, mode);
    set({ themeMode: mode });
  },

  setLockEnabled: async (enabled) => {
    await setSetting(KEYS.lockEnabled, enabled ? '1' : '0');
    set({ lockEnabled: enabled });
  },
}));
