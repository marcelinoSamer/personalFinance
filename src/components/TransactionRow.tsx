import { List, Avatar, useTheme } from 'react-native-paper';

import { MoneyText } from './MoneyText';
import { categoryLabel } from '@/ui/labels';
import { formatDate } from '@/ui/date';
import { t } from '@/i18n';
import type { TransactionView } from '@/db/repositories/transactions';

interface Props {
  tx: TransactionView;
  onPress?: () => void;
}

export function TransactionRow({ tx, onPress }: Props) {
  const theme = useTheme();
  const isExpense = tx.kind === 'expense';
  const title =
    tx.merchant ||
    (tx.category_id ? categoryLabel({ id: tx.category_id, name: tx.category_name ?? '' }) : '') ||
    t(isExpense ? 'tx.expense' : 'tx.income');

  const catName = tx.category_id
    ? categoryLabel({ id: tx.category_id, name: tx.category_name ?? '' })
    : null;
  const description = [catName, tx.account_name, formatDate(tx.occurred_at)]
    .filter(Boolean)
    .join(' · ');

  const icon = tx.category_icon || (isExpense ? 'arrow-up' : 'arrow-down');
  const color = tx.category_color || (isExpense ? theme.colors.errorContainer : theme.colors.primaryContainer);

  return (
    <List.Item
      title={title}
      description={description}
      onPress={onPress}
      left={() => <Avatar.Icon size={40} icon={icon} style={{ backgroundColor: color }} color="#fff" />}
      right={() => (
        <MoneyText
          value={isExpense ? -tx.amount : tx.amount}
          currency={tx.currency}
          colorBySign
          signed
        />
      )}
    />
  );
}
