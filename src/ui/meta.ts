import type { AccountType, AssetType } from '@/db/schema';

export const ACCOUNT_TYPE_META: Record<AccountType, { icon: string; color: string }> = {
  cash: { icon: 'cash', color: '#43A047' },
  bank: { icon: 'bank', color: '#1E88E5' },
  wallet: { icon: 'wallet', color: '#8E24AA' },
  savings: { icon: 'piggy-bank', color: '#00897B' },
  // Hidden account behind a "Just this time" box; not offered in the type picker.
  box: { icon: 'party-popper', color: '#5C6BC0' },
};

export const ASSET_TYPE_META: Record<AssetType, { icon: string; color: string }> = {
  gold: { icon: 'gold', color: '#FBC02D' },
  stock: { icon: 'chart-line', color: '#1E88E5' },
  crypto: { icon: 'bitcoin', color: '#F7931A' },
  property: { icon: 'home-city', color: '#6D4C41' },
  other: { icon: 'shape', color: '#78909C' },
};

export const ACCOUNT_TYPES: AccountType[] = ['cash', 'bank', 'wallet', 'savings'];
export const ASSET_TYPES: AssetType[] = ['gold', 'stock', 'crypto', 'property', 'other'];
