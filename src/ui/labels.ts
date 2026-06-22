import { getLocale, t } from '@/i18n';
import type { AccountType, AssetType, Category } from '@/db/schema';

// Arabic display names for the seeded default categories (stored name is English).
const DEFAULT_CATEGORY_AR: Record<string, string> = {
  cat_food: 'الطعام والمطاعم',
  cat_groceries: 'البقالة',
  cat_transport: 'المواصلات',
  cat_bills: 'الفواتير والخدمات',
  cat_rent: 'الإيجار والسكن',
  cat_shopping: 'التسوق',
  cat_health: 'الصحة',
  cat_entertainment: 'الترفيه',
  cat_education: 'التعليم',
  cat_expense_other: 'أخرى',
  cat_salary: 'الراتب',
  cat_business: 'الأعمال',
  cat_gift: 'هدية',
  cat_investment: 'استثمار',
  cat_income_other: 'أخرى',
};

export function categoryLabel(
  cat?: Pick<Category, 'id' | 'name'> | null,
): string {
  if (!cat) return t('common.none');
  if (getLocale() === 'ar' && DEFAULT_CATEGORY_AR[cat.id]) return DEFAULT_CATEGORY_AR[cat.id];
  return cat.name;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function accountTypeLabel(type: AccountType): string {
  return t(`accounts.type${cap(type)}`);
}

export function assetTypeLabel(type: AssetType): string {
  return t(`asset.type${cap(type)}`);
}
