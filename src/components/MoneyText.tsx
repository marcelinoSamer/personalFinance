import { Text, useTheme } from 'react-native-paper';
import type { StyleProp, TextStyle } from 'react-native';

import { formatMoney } from '@/money/format';
import type { CurrencyCode } from '@/money/currencies';
import { getLocale } from '@/i18n';
import type { AppTheme } from '@/theme';

type Variant =
  | 'displaySmall'
  | 'headlineMedium'
  | 'titleLarge'
  | 'titleMedium'
  | 'titleSmall'
  | 'bodyLarge'
  | 'bodyMedium'
  | 'bodySmall'
  | 'labelLarge';

// Large figures read in the serif (heritage/banknote feel); smaller amounts in
// the tabular grotesque so columns align.
const SERIF_VARIANTS: Variant[] = ['displaySmall', 'headlineMedium', 'titleLarge'];

interface Props {
  value: number;
  currency: CurrencyCode;
  /** Color positive green / negative red. */
  colorBySign?: boolean;
  /** Always show +/- sign. */
  signed?: boolean;
  muted?: boolean;
  /** Mark this figure as *value* — renders in brass-gold. */
  tone?: 'gold';
  variant?: Variant;
  style?: StyleProp<TextStyle>;
}

export function MoneyText({
  value,
  currency,
  colorBySign,
  signed,
  muted,
  tone,
  variant = 'bodyLarge',
  style,
}: Props) {
  const theme = useTheme<AppTheme>();
  const ar = getLocale() === 'ar';

  let color: string | undefined;
  if (tone === 'gold') {
    color = theme.semantic.gold;
  } else if (colorBySign) {
    color =
      value > 0
        ? theme.semantic.positive
        : value < 0
          ? theme.semantic.negative
          : theme.semantic.neutral;
  } else if (muted) {
    color = theme.colors.onSurfaceVariant;
  }

  const fontFamily = SERIF_VARIANTS.includes(variant)
    ? theme.tokens.font.serif.semibold
    : theme.tokens.font.sans.semibold;

  return (
    <Text
      variant={variant}
      style={[{ color, fontFamily, fontVariant: ['tabular-nums'] }, style]}
    >
      {formatMoney(value, currency, { arabicDigits: ar, signed })}
    </Text>
  );
}
