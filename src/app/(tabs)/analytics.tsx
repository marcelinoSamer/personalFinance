import { useState } from 'react';
import { Dimensions, View, StyleSheet } from 'react-native';
import { Card, List, SegmentedButtons, Text, useTheme } from 'react-native-paper';
import { PieChart, LineChart } from 'react-native-gifted-charts';

import { Screen } from '@/components/Screen';
import { MoneyText } from '@/components/MoneyText';
import { EmptyState } from '@/components/EmptyState';
import { t } from '@/i18n';
import { convert, buildRateLookup } from '@/money/fx';
import { formatCompact } from '@/money/format';
import { categoryLabel } from '@/ui/labels';
import { addMonths, monthRange, shortMonth } from '@/ui/date';
import { expenseByCategory, merchantTotals } from '@/db/repositories/stats';
import { sumByKindCurrency } from '@/db/repositories/transactions';
import { listRates } from '@/db/repositories/fxRates';
import { useAsyncData } from '@/state/dataVersion';
import { useSettings } from '@/state/settings';
import type { AppTheme } from '@/theme';

type Period = 'month' | 'quarter' | 'year';

function rangeFor(period: Period) {
  const now = Date.now();
  if (period === 'month') return monthRange(now);
  if (period === 'quarter') return { from: monthRange(addMonths(now, -2)).from, to: monthRange(now).to };
  return { from: monthRange(addMonths(now, -11)).from, to: monthRange(now).to };
}

export default function AnalyticsScreen() {
  const theme = useTheme<AppTheme>();
  const display = useSettings((s) => s.displayCurrency);
  const [period, setPeriod] = useState<Period>('month');
  const width = Dimensions.get('window').width - 64;

  const { data } = useAsyncData(async () => {
    const range = rangeFor(period);
    const [catRows, merchRows, rates] = await Promise.all([
      expenseByCategory(range.from, range.to),
      merchantTotals(range.from, range.to, 'expense'),
      listRates(),
    ]);
    const lookup = buildRateLookup(rates);

    const catMap = new Map<string, { label: string; color: string; total: number }>();
    for (const r of catRows) {
      const c = convert(r.total, r.currency, display, lookup, display);
      if (c.value == null) continue;
      const key = r.category_id ?? 'none';
      const label = r.category_id
        ? categoryLabel({ id: r.category_id, name: r.category_name ?? '' })
        : t('common.none');
      const e = catMap.get(key) ?? { label, color: r.category_color ?? '#90A4AE', total: 0 };
      e.total += c.value;
      catMap.set(key, e);
    }
    const categories = [...catMap.values()].sort((a, b) => b.total - a.total);
    const categoriesTotal = categories.reduce((sum, c) => sum + c.total, 0);

    const merchMap = new Map<string, number>();
    for (const r of merchRows) {
      const c = convert(r.total, r.currency, display, lookup, display);
      if (c.value == null) continue;
      merchMap.set(r.merchant, (merchMap.get(r.merchant) ?? 0) + c.value);
    }
    const merchants = [...merchMap.entries()]
      .map(([merchant, total]) => ({ merchant, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const trend: { label: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const ts = addMonths(Date.now(), -i);
      const r = monthRange(ts);
      const sums = await sumByKindCurrency(r.from, r.to);
      let income = 0;
      let expense = 0;
      for (const s of sums) {
        const c = convert(s.total, s.currency, display, lookup, display);
        if (c.value == null) continue;
        if (s.kind === 'income') income += c.value;
        else expense += c.value;
      }
      trend.push({ label: shortMonth(ts), income, expense });
    }

    return { categories, categoriesTotal, merchants, trend };
  }, [period, display]);

  const hasData = data && (data.categories.length > 0 || data.merchants.length > 0);

  return (
    <Screen>
      <SegmentedButtons
        value={period}
        onValueChange={(v) => setPeriod(v as Period)}
        buttons={[
          { value: 'month', label: t('dashboard.thisMonth') },
          { value: 'quarter', label: '3M' },
          { value: 'year', label: '12M' },
        ]}
      />

      {!hasData && <EmptyState icon="chart-arc" text={t('analytics.noData')} />}

      {data && data.categories.length > 0 && (
        <Card mode="contained">
          <Card.Title title={t('analytics.byCategory')} />
          <Card.Content style={{ alignItems: 'center' }}>
            <PieChart
              donut
              data={data.categories.map((c) => ({ value: c.total, color: c.color }))}
              radius={90}
              innerRadius={55}
              innerCircleColor={theme.colors.surface}
              centerLabelComponent={() => (
                <MoneyText value={data.categoriesTotal} currency={display} variant="titleMedium" />
              )}
            />
            <View style={{ width: '100%', marginTop: 12 }}>
              {data.categories.slice(0, 6).map((c) => (
                <View key={c.label} style={styles.legendRow}>
                  <View style={styles.legendLeft}>
                    <View style={[styles.dot, { backgroundColor: c.color }]} />
                    <Text>{c.label}</Text>
                  </View>
                  <MoneyText value={c.total} currency={display} variant="bodyMedium" />
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>
      )}

      {data && data.trend.some((m) => m.income > 0 || m.expense > 0) && (
        <Card mode="contained">
          <Card.Title title={t('analytics.trend')} />
          <Card.Content style={{ alignItems: 'center' }}>
            <LineChart
              data={data.trend.map((m) => ({ value: m.expense, label: m.label }))}
              data2={data.trend.map((m) => ({ value: m.income }))}
              color1={theme.semantic.expense}
              color2={theme.semantic.income}
              thickness={2}
              width={width}
              height={160}
              hideRules
              yAxisThickness={0}
              xAxisThickness={0}
              formatYLabel={(v: string) => formatCompact(Number(v))}
              yAxisTextStyle={{ color: theme.colors.onSurfaceVariant }}
              xAxisLabelTextStyle={{ color: theme.colors.onSurfaceVariant }}
            />
            <View style={[styles.legendRow, { marginTop: 8 }]}>
              <View style={styles.legendLeft}>
                <View style={[styles.dot, { backgroundColor: theme.semantic.income }]} />
                <Text>{t('dashboard.income')}</Text>
              </View>
              <View style={styles.legendLeft}>
                <View style={[styles.dot, { backgroundColor: theme.semantic.expense }]} />
                <Text>{t('dashboard.expenses')}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {data && data.merchants.length > 0 && (
        <Card mode="contained">
          <Card.Title title={t('analytics.topMerchants')} />
          <Card.Content style={{ paddingHorizontal: 0 }}>
            {data.merchants.map((m) => (
              <List.Item
                key={m.merchant}
                title={m.merchant}
                right={() => <MoneyText value={m.total} currency={display} variant="bodyMedium" />}
              />
            ))}
          </Card.Content>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, gap: 16 },
  legendLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
