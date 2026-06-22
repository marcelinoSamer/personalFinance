import { Text } from 'react-native-paper';
import type { StyleProp, TextStyle } from 'react-native';
import { useTheme } from 'react-native-paper';

import { formatMoney } from '@/money/format';
import type { CurrencyCode } from '@/money/currencies';
import { getLocale } from '@/i18n';
import type { AppTheme } from '@/theme';

type Variant =
  | 'displaySmall'
  | 'headlineMedium'
  | 'titleLarge'
  | 'titleMedium'
  | 'bodyLarge'
  | 'bodyMedium'
  | 'bodySmall'
  | 'labelLarge';

interface Props {
  value: number;
  currency: CurrencyCode;
  /** Color positive green / negative red. */
  colorBySign?: boolean;
  /** Always show +/- sign. */
  signed?: boolean;
  muted?: boolean;
  variant?: Variant;
  style?: StyleProp<TextStyle>;
}

export function MoneyText({
  value,
  currency,
  colorBySign,
  signed,
  muted,
  variant = 'bodyLarge',
  style,
}: Props) {
  const theme = useTheme<AppTheme>();
  const ar = getLocale() === 'ar';

  let color: string | undefined;
  if (colorBySign) {
    color = value > 0 ? theme.semantic.positive : value < 0 ? theme.semantic.negative : theme.semantic.neutral;
  } else if (muted) {
    color = theme.colors.onSurfaceVariant;
  }

  return (
    <Text variant={variant} style={[{ color, fontWeight: '600' }, style]}>
      {formatMoney(value, currency, { arabicDigits: ar, signed })}
    </Text>
  );
}
