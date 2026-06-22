import { TextInput } from 'react-native-paper';

import { t } from '@/i18n';
import { sanitizeDecimal } from '@/ui/number';
import { currencyMeta, type CurrencyCode } from '@/money/currencies';

interface Props {
  label?: string;
  value: string;
  onChangeText: (s: string) => void;
  currency?: CurrencyCode;
  autoFocus?: boolean;
}

export function AmountInput({ label, value, onChangeText, currency, autoFocus }: Props) {
  return (
    <TextInput
      mode="outlined"
      label={label ?? t('common.amount')}
      value={value}
      keyboardType="decimal-pad"
      autoFocus={autoFocus}
      onChangeText={(x) => onChangeText(sanitizeDecimal(x))}
      left={currency ? <TextInput.Affix text={currencyMeta(currency).symbol} /> : undefined}
    />
  );
}
