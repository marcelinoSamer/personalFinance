import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { router } from 'expo-router';
import { Banner, SegmentedButtons, Text, useTheme } from 'react-native-paper';
import { PieChart, LineChart } from 'react-native-gifted-charts';

import { Screen } from '@/components/Screen';
import { MoneyText } from '@/components/MoneyText';
import { Eyebrow } from '@/components/Eyebrow';
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

interface CatRow {
  label: string;
  color: string;
  total: number;
}

interface TrendPoint {
  label: string;
  income: number;
  expense: number;
}

interface AnalyticsData {
  categories: CatRow[];
  categoriesTotal: number;
  merchants: { merchant: string; total: number }[];
  trend: TrendPoint[];
  missingRates: boolean;
}

function rangeFor(period: Period) {
  const now = Date.now();
  if (period === 'month') return monthRange(now);
  if (period === 'quarter')
    return { from: monthRange(addMonths(now, -2)).from, to: monthRange(now).to };
  return { from: monthRange(addMonths(now, -11)).from, to: monthRange(now).to };
}

const MAX_LEGEND = 6;

export default function AnalyticsScreen() {
  const theme = useTheme<AppTheme>();
  const display = useSettings((s) => s.displayCurrency);
  const [period, setPeriod] = useState<Period>('month');
  const [chartWidth, setChartWidth] = useState(0);

  const { data, loading, reload } = useAsyncData<AnalyticsData>(async () => {
    const range = rangeFor(period);
    const trendMonths = period === 'year' ? 12 : period === 'quarter' ? 3 : 6;
    const trendRanges = Array.from({ length: trendMonths }, (_, i) => {
      const ts = addMonths(Date.now(), -(trendMonths - 1 - i));
      return { ts, range: monthRange(ts) };
    });

    const [catRows, merchRows, rates, ...trendSums] = await Promise.all([
      expenseByCategory(range.from, range.to),
      merchantTotals(range.from, range.to, 'expense'),
      listRates(),
      ...trendRanges.map(({ range: r }) => sumByKindCurrency(r.from, r.to)),
    ]);

    const lookup = buildRateLookup(rates);
    let missingRates = false;

    const catMap = new Map<string, CatRow>();
    for (const r of catRows) {
      const c = convert(r.total, r.currency, display, lookup, display);
      if (c.value == null) {
        missingRates = true;
        continue;
      }
      const key = r.category_id ?? 'none';
      const label = r.category_id
        ? categoryLabel({ id: r.category_id, name: r.category_name ?? '' })
        : t('common.none');
      const e = catMap.get(key) ?? {
        label,
        color: r.category_color ?? theme.semantic.neutral,
        total: 0,
      };
      e.total += c.value;
      catMap.set(key, e);
    }
    const categories = [...catMap.values()]
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total);
    const categoriesTotal = categories.reduce((sum, c) => sum + c.total, 0);

    const merchMap = new Map<string, number>();
    for (const r of merchRows) {
      const c = convert(r.total, r.currency, display, lookup, display);
      if (c.value == null) {
        missingRates = true;
        continue;
      }
      merchMap.set(r.merchant, (merchMap.get(r.merchant) ?? 0) + c.value);
    }
    const merchants = [...merchMap.entries()]
      .map(([merchant, total]) => ({ merchant, total }))
      .filter((m) => m.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const trend: TrendPoint[] = trendRanges.map(({ ts }, i) => {
      const sums = trendSums[i];
      let income = 0;
      let expense = 0;
      for (const s of sums) {
        const c = convert(s.total, s.currency, display, lookup, display);
        if (c.value == null) {
          missingRates = true;
          continue;
        }
        if (s.kind === 'income') income += c.value;
        else expense += c.value;
      }
      return { label: shortMonth(ts), income, expense };
    });

    return { categories, categoriesTotal, merchants, trend, missingRates };
  }, [period, display]);

  const hasData =
    data && (data.categories.length > 0 || data.merchants.length > 0 || data.trend.some((m) => m.income > 0 || m.expense > 0));

  const legend = useMemo(() => {
    if (!data) return [] as CatRow[];
    return data.categories.slice(0, MAX_LEGEND);
  }, [data]);
  const extra = data ? data.categories.length - legend.length : 0;

  const onChartLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && w !== chartWidth) setChartWidth(w);
  };

  return (
    <Screen refreshing={loading} onRefresh={reload}>
      <SegmentedButtons
        value={period}
        onValueChange={(v) => setPeriod(v as Period)}
        buttons={[
          { value: 'month', label: t('dashboard.thisMonth') },
          { value: 'quarter', label: t('analytics.period3M') },
          { value: 'year', label: t('analytics.period12M') },
        ]}
      />

      {data?.missingRates && (
        <Banner
          visible
          icon="alert-circle-outline"
          actions={[{ label: t('fx.title'), onPress: () => router.push('/fx-rates') }]}
        >
          {t('dashboard.missingRates')}
        </Banner>
      )}

      {!hasData && !loading && <EmptyState icon="chart-arc" text={t('analytics.noData')} />}

      {data && data.categories.length > 0 && (
        <Section title={t('analytics.byCategory')}>
          <View style={styles.cardContent}>
            <View style={styles.donutWrap}>
              <PieChart
                donut
                data={data.categories.map((c) => ({ value: c.total, color: c.color }))}
                radius={92}
                innerRadius={58}
                innerCircleColor={theme.colors.surface}
                centerLabelComponent={() => (
                  <View style={styles.centerLabel}>
                    <Text
                      variant="labelSmall"
                      style={{ color: theme.colors.onSurfaceVariant }}
                    >
                      {t('dashboard.expenses')}
                    </Text>
                    <Text
                      variant="titleMedium"
                      style={[styles.centerNumber, { color: theme.colors.onSurface }]}
                    >
                      {formatCompact(data.categoriesTotal)}
                    </Text>
                  </View>
                )}
              />
            </View>
            <View style={styles.legend}>
              {legend.map((c) => {
                const share = data.categoriesTotal > 0
                  ? Math.round((c.total / data.categoriesTotal) * 100)
                  : 0;
                return (
                  <View key={c.label} style={styles.legendRow}>
                    <View style={styles.legendLeft}>
                      <View style={[styles.dot, { backgroundColor: c.color }]} />
                      <Text numberOfLines={1} style={styles.legendLabel}>
                        {c.label}
                      </Text>
                    </View>
                    <View style={styles.legendRight}>
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        {share}%
                      </Text>
                      <MoneyText
                        value={c.total}
                        currency={display}
                        variant="bodyMedium"
                      />
                    </View>
                  </View>
                );
              })}
              {extra > 0 && (
                <Text
                  variant="bodySmall"
                  style={[styles.moreLabel, { color: theme.colors.onSurfaceVariant }]}
                >
                  {t('analytics.moreCategories', { count: extra })}
                </Text>
              )}
            </View>
          </View>
        </Section>
      )}

      {data && data.trend.some((m) => m.income > 0 || m.expense > 0) && (
        <Section title={t('analytics.trend')}>
          <View style={styles.cardContent}>
            <View style={styles.chartWrap} onLayout={onChartLayout}>
              {chartWidth > 0 && (
                <LineChart
                  data={data.trend.map((m) => ({ value: m.expense, label: m.label }))}
                  data2={data.trend.map((m) => ({ value: m.income }))}
                  color1={theme.semantic.expense}
                  color2={theme.semantic.income}
                  thickness={2}
                  width={chartWidth}
                  adjustToWidth
                  height={160}
                  hideRules
                  yAxisThickness={0}
                  xAxisThickness={0}
                  noOfSections={3}
                  formatYLabel={(v: string) => formatCompact(Number(v))}
                  yAxisTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}
                  xAxisLabelTextStyle={{
                    color: theme.colors.onSurfaceVariant,
                    fontSize: 10,
                  }}
                  initialSpacing={8}
                  endSpacing={8}
                />
              )}
            </View>
            <View style={styles.trendLegend}>
              <View style={styles.legendLeft}>
                <View style={[styles.dot, { backgroundColor: theme.semantic.income }]} />
                <Text variant="bodySmall">{t('dashboard.income')}</Text>
              </View>
              <View style={styles.legendLeft}>
                <View style={[styles.dot, { backgroundColor: theme.semantic.expense }]} />
                <Text variant="bodySmall">{t('dashboard.expenses')}</Text>
              </View>
            </View>
          </View>
        </Section>
      )}

      {data && data.merchants.length > 0 && (
        <Section title={t('analytics.topMerchants')}>
          <View style={styles.merchantsContent}>
            {data.merchants.map((m, i) => (
              <View key={m.merchant}>
                {i > 0 && (
                  <View
                    style={[
                      styles.merchantDivider,
                      { backgroundColor: theme.colors.outlineVariant },
                    ]}
                  />
                )}
                <View style={styles.merchantRow}>
                  <Text
                    variant="bodyLarge"
                    numberOfLines={1}
                    style={[styles.merchantName, { color: theme.colors.onSurface }]}
                  >
                    {m.merchant}
                  </Text>
                  <MoneyText value={m.total} currency={display} variant="titleSmall" />
                </View>
              </View>
            ))}
          </View>
        </Section>
      )}
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme<AppTheme>();
  const { radius, spacing } = theme.tokens;
  return (
    <View style={{ gap: spacing.sm }}>
      <Eyebrow>{title}</Eyebrow>
      <View
        style={[
          { backgroundColor: theme.colors.surface, borderRadius: radius.lg, padding: spacing.lg },
          theme.tokens.shadow.card,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContent: { paddingTop: 0, gap: 12 },
  donutWrap: { alignItems: 'center', paddingVertical: 8 },
  centerLabel: { alignItems: 'center', gap: 2 },
  centerNumber: { fontVariant: ['tabular-nums'] },
  legend: { gap: 10 },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  legendLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  legendRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendLabel: { flexShrink: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  moreLabel: { paddingTop: 4 },
  chartWrap: { paddingTop: 8 },
  trendLegend: { flexDirection: 'row', gap: 24, paddingTop: 4 },
  merchantsContent: { paddingTop: 0 },
  merchantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  merchantName: { flex: 1 },
  merchantDivider: { height: StyleSheet.hairlineWidth },
});
