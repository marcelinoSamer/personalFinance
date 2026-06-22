import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Chip, Divider, List, Text, useTheme } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { MoneyText } from '@/components/MoneyText';
import { TransactionRow } from '@/components/TransactionRow';
import { EmptyState } from '@/components/EmptyState';
import { t } from '@/i18n';
import { convert } from '@/money/fx';
import { monthRange } from '@/ui/date';
import { sumByKindCurrency } from '@/db/repositories/transactions';
import { listTransactions } from '@/db/repositories/transactions';
import { usePortfolio } from '@/state/portfolio';
import { useAsyncData } from '@/state/dataVersion';
import { checkBudgetsAndNotify } from '@/notifications/budgets';
import type { AppTheme } from '@/theme';

export default function DashboardScreen() {
  const theme = useTheme<AppTheme>();
  const { data: pf, loading, reload } = usePortfolio();
  const { data: extra } = useAsyncData(async () => {
    const range = monthRange();
    const [sums, recent] = await Promise.all([
      sumByKindCurrency(range.from, range.to),
      listTransactions({ limit: 6 }),
    ]);
    return { sums, recent };
  });

  // Convert this month's per-currency sums into the display currency.
  let income = 0;
  let expense = 0;
  if (pf && extra) {
    for (const s of extra.sums) {
      const r = convert(s.total, s.currency, pf.display, pf.lookup, pf.display);
      if (r.value == null) continue;
      if (s.kind === 'income') income += r.value;
      else expense += r.value;
    }
  }

  // Check budget thresholds and surface local notifications when crossed.
  useEffect(() => {
    checkBudgetsAndNotify().catch(() => {});
  }, []);

  const empty = pf && pf.accounts.length === 0 && pf.assets.length === 0;

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      {/* Net worth */}
      <Card mode="elevated">
        <Card.Content style={{ gap: 4 }}>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            {t('dashboard.netWorth')}
          </Text>
          <MoneyText value={pf?.netWorth.total ?? 0} currency={pf?.display ?? 'EGP'} variant="displaySmall" />
          <View style={styles.row}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('accounts.containers')}: <MoneyText value={pf?.netWorth.cash ?? 0} currency={pf?.display ?? 'EGP'} variant="bodySmall" />
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('accounts.assets')}: <MoneyText value={pf?.netWorth.assets ?? 0} currency={pf?.display ?? 'EGP'} variant="bodySmall" />
            </Text>
          </View>
          {pf && pf.netWorth.missing.length > 0 && (
            <Chip icon="alert" onPress={() => router.push('/fx-rates')} style={{ marginTop: 8 }}>
              {t('dashboard.missingRates')}
            </Chip>
          )}
        </Card.Content>
      </Card>

      {/* This month */}
      <Card mode="contained">
        <Card.Content>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
            {t('dashboard.thisMonth')}
          </Text>
          <View style={styles.row}>
            <View>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{t('dashboard.income')}</Text>
              <MoneyText value={income} currency={pf?.display ?? 'EGP'} variant="titleMedium" style={{ color: theme.semantic.income }} />
            </View>
            <View>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{t('dashboard.expenses')}</Text>
              <MoneyText value={expense} currency={pf?.display ?? 'EGP'} variant="titleMedium" style={{ color: theme.semantic.expense }} />
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Quick add */}
      <View style={styles.quickRow}>
        <Button mode="contained-tonal" icon="arrow-down" style={styles.quickBtn} onPress={() => router.push({ pathname: '/transaction-edit', params: { kind: 'income' } })}>
          {t('dashboard.addIncome')}
        </Button>
        <Button mode="contained-tonal" icon="arrow-up" style={styles.quickBtn} onPress={() => router.push({ pathname: '/transaction-edit', params: { kind: 'expense' } })}>
          {t('dashboard.addExpense')}
        </Button>
        <Button mode="contained-tonal" icon="swap-horizontal" style={styles.quickBtn} onPress={() => router.push('/transfer')}>
          {t('dashboard.transfer')}
        </Button>
      </View>

      {empty && <EmptyState icon="bank-plus" text={t('accounts.noContainers')} />}

      {/* Balances */}
      {pf && pf.accounts.length > 0 && (
        <Card mode="contained">
          <Card.Title title={t('dashboard.balances')} />
          <Card.Content style={{ paddingHorizontal: 0 }}>
            {pf.accounts.slice(0, 5).map((a) => (
              <List.Item
                key={a.id}
                title={a.name}
                description={a.currency}
                left={() => <List.Icon icon={a.icon ?? 'wallet'} color={a.color ?? undefined} />}
                right={() => <MoneyText value={a.balance} currency={a.currency} />}
                onPress={() => router.push({ pathname: '/account-edit', params: { id: a.id } })}
              />
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Recent */}
      {extra && extra.recent.length > 0 && (
        <Card mode="contained">
          <Card.Title title={t('dashboard.recent')} />
          <Card.Content style={{ paddingHorizontal: 0 }}>
            {extra.recent.map((tx, i) => (
              <View key={tx.id}>
                {i > 0 && <Divider />}
                <TransactionRow tx={tx} onPress={() => router.push({ pathname: '/transaction-edit', params: { id: tx.id } })} />
              </View>
            ))}
          </Card.Content>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quickRow: { flexDirection: 'row', gap: 8 },
  quickBtn: { flex: 1 },
});
