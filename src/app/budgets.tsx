import { View, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { Card, FAB, ProgressBar, Text, useTheme } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { MoneyText } from '@/components/MoneyText';
import { EmptyState } from '@/components/EmptyState';
import { t } from '@/i18n';
import { buildRateLookup } from '@/money/fx';
import { computeBudgetStatuses } from '@/money/budgets';
import { categoryLabel } from '@/ui/labels';
import { monthRange } from '@/ui/date';
import { listBudgets } from '@/db/repositories/budgets';
import { expenseByCategory } from '@/db/repositories/stats';
import { listRates } from '@/db/repositories/fxRates';
import { useAsyncData } from '@/state/dataVersion';
import type { AppTheme } from '@/theme';

export default function BudgetsScreen() {
  const theme = useTheme<AppTheme>();

  const { data } = useAsyncData(async () => {
    const range = monthRange();
    const [budgets, rows, rates] = await Promise.all([
      listBudgets(),
      expenseByCategory(range.from, range.to),
      listRates(),
    ]);
    const lookup = buildRateLookup(rates);
    return computeBudgetStatuses(budgets, rows, lookup);
  });

  return (
    <View style={styles.flex}>
      <Screen>
        <Stack.Screen options={{ title: t('budgets.title') }} />
        {!data || data.length === 0 ? (
          <EmptyState icon="chart-donut" text={t('budgets.empty')} />
        ) : (
          data.map((st) => {
            const name = st.budget.category_id
              ? categoryLabel({ id: st.budget.category_id, name: st.budget.category_name ?? '' })
              : t('budgets.overall');
            const remaining = st.budget.limit_amount - st.spent;
            const color = st.over ? theme.semantic.expense : theme.colors.primary;
            return (
              <Card
                key={st.budget.id}
                mode="contained"
                onPress={() => router.push({ pathname: '/budget-edit', params: { id: st.budget.id } })}
              >
                <Card.Content style={{ gap: 6 }}>
                  <View style={styles.row}>
                    <Text variant="titleMedium">{name}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {Math.round(st.percent)}%
                    </Text>
                  </View>
                  <ProgressBar progress={Math.min(1, st.percent / 100)} color={color} />
                  <View style={styles.row}>
                    <MoneyText value={st.spent} currency={st.budget.currency} variant="bodyMedium" />
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>
                      / {st.budget.limit_amount}
                    </Text>
                  </View>
                  <Text variant="bodySmall" style={{ color: st.over ? theme.semantic.expense : theme.semantic.neutral }}>
                    {st.over
                      ? t('budgets.overBudget')
                      : `${t('budgets.remaining')}: `}
                    {!st.over && <MoneyText value={remaining} currency={st.budget.currency} variant="bodySmall" />}
                  </Text>
                </Card.Content>
              </Card>
            );
          })
        )}
      </Screen>
      <FAB icon="plus" style={styles.fab} onPress={() => router.push('/budget-edit')} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
