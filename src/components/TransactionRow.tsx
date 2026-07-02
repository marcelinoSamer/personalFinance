import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { MoneyText } from './MoneyText';
import { categoryLabel } from '@/ui/labels';
import { formatDate } from '@/ui/date';
import { t } from '@/i18n';
import type { TransactionView } from '@/db/repositories/transactions';
import type { AppTheme } from '@/theme';

interface Props {
  tx: TransactionView;
  onPress?: () => void;
}

export function TransactionRow({ tx, onPress }: Props) {
  const theme = useTheme<AppTheme>();
  const { spacing, radius } = theme.tokens;
  const isExpense = tx.kind === 'expense';

  const title =
    tx.merchant ||
    (tx.category_id ? categoryLabel({ id: tx.category_id, name: tx.category_name ?? '' }) : '') ||
    t(isExpense ? 'tx.expense' : 'tx.income');

  const catName = tx.category_id
    ? categoryLabel({ id: tx.category_id, name: tx.category_name ?? '' })
    : null;
  const meta = [catName, tx.account_name, formatDate(tx.occurred_at)].filter(Boolean).join('  ·  ');

  const icon = tx.category_icon || (isExpense ? 'arrow-top-right' : 'arrow-bottom-left');
  const hasColor = !!tx.category_color;
  const chipBg = tx.category_color ?? theme.colors.surfaceVariant;
  const iconColor = hasColor ? '#fff' : isExpense ? theme.semantic.negative : theme.semantic.positive;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.md },
        pressed && { backgroundColor: theme.colors.surfaceVariant },
      ]}
    >
      <View style={[styles.chip, { backgroundColor: chipBg, borderRadius: radius.md }]}>
        <MaterialCommunityIcons name={icon as never} size={20} color={iconColor} />
      </View>
      <View style={styles.body}>
        <Text variant="titleSmall" numberOfLines={1} style={{ color: theme.colors.onSurface }}>
          {title}
        </Text>
        {!!meta && (
          <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>
            {meta}
          </Text>
        )}
      </View>
      <MoneyText
        value={isExpense ? -tx.amount : tx.amount}
        currency={tx.currency}
        colorBySign
        signed
        variant="titleSmall"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  chip: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
});
