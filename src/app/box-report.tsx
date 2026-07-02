import { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Text, useTheme } from 'react-native-paper';
import { BarChart } from 'react-native-gifted-charts';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { MoneyText } from '@/components/MoneyText';
import { Eyebrow } from '@/components/Eyebrow';
import { t } from '@/i18n';
import { categoryLabel } from '@/ui/labels';
import { formatCompact } from '@/money/format';
import { boxPhase, buildBoxReport, type BoxVerdict } from '@/money/boxes';
import { getBox } from '@/db/repositories/boxes';
import { listTransactions } from '@/db/repositories/transactions';
import { listCategories } from '@/db/repositories/categories';
import { useAsyncData } from '@/state/dataVersion';
import type { Category } from '@/db/schema';
import type { AppTheme } from '@/theme';

const VERDICT_META: Record<BoxVerdict, { icon: string; tone: 'positive' | 'neutral' | 'negative'; text: string }> = {
  underBudget: { icon: 'party-popper', tone: 'positive', text: 'boxes.verdictUnder' },
  nearBudget: { icon: 'check-circle-outline', tone: 'positive', text: 'boxes.verdictNear' },
  overBudget: { icon: 'alert-outline', tone: 'negative', text: 'boxes.verdictOver' },
  farOverBudget: { icon: 'alert-circle-outline', tone: 'negative', text: 'boxes.verdictFarOver' },
};

export default function BoxReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme<AppTheme>();
  const { spacing, radius } = theme.tokens;
  const [chartWidth, setChartWidth] = useState(0);

  const { data } = useAsyncData(async () => {
    if (!id) return null;
    const box = await getBox(id);
    if (!box) return null;
    const [txs, cats] = await Promise.all([
      listTransactions({ accountId: box.account_id, limit: 500 }),
      listCategories(),
    ]);
    const report = buildBoxReport(
      { budget_amount: box.budget_amount, starts_at: box.starts_at, ends_at: box.ends_at },
      txs.map((tx) => ({
        kind: tx.kind,
        amount: tx.amount,
        occurred_at: tx.occurred_at,
        category_id: tx.category_id,
        merchant: tx.merchant,
      })),
    );
    return { box, report, cats };
  }, [id]);

  const catName = useMemo(() => {
    const map = new Map<string, Category>((data?.cats ?? []).map((c) => [c.id, c]));
    return (catId: string | null) =>
      catId ? categoryLabel(map.get(catId) ?? { id: catId, name: catId }) : t('common.none');
  }, [data?.cats]);

  if (!data || !data.box) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('boxes.report') }} />
      </Screen>
    );
  }

  const { box, report } = data;
  const currency = box.currency;
  const phase = boxPhase(box);
  const running = phase === 'upcoming' || phase === 'active';
  const verdict = VERDICT_META[report.verdict];
  const verdictColor =
    verdict.tone === 'positive'
      ? theme.semantic.positive
      : verdict.tone === 'negative'
        ? theme.semantic.negative
        : theme.colors.onSurfaceVariant;
  const saved = report.delta >= 0;

  const onChartLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && w !== chartWidth) setChartWidth(w);
  };

  const maxDay = report.days.reduce((m, d) => Math.max(m, d.total), 0);
  const barData = report.days.map((d) => ({
    value: d.total,
    label: String(new Date(d.day).getDate()),
    frontColor:
      d.total === report.peakDay?.total && d.total > 0
        ? theme.semantic.negative
        : box.color ?? theme.colors.primary,
  }));

  return (
    <Screen>
      <Stack.Screen options={{ title: box.name }} />

      {/* Verdict banner */}
      <View
        style={[
          styles.verdict,
          { backgroundColor: theme.colors.surface, borderRadius: radius.lg, padding: spacing.xl },
          theme.tokens.shadow.card,
        ]}
      >
        {running && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
            {t('boxes.reportSoFar')}
          </Text>
        )}
        <View style={styles.verdictHead}>
          <View style={[styles.verdictIcon, { backgroundColor: theme.colors.surfaceVariant, borderRadius: radius.pill }]}>
            <MaterialCommunityIcons name={verdict.icon as never} size={28} color={verdictColor} />
          </View>
          <Text variant="titleMedium" style={{ color: verdictColor, flex: 1 }}>
            {t(verdict.text)}
          </Text>
        </View>
        <View style={[styles.deltaLine, { marginTop: spacing.md }]}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {saved ? t('boxes.underBy', { amount: '' }).trim() : t('boxes.overBy', { amount: '' }).trim()}{' '}
          </Text>
          <MoneyText
            value={Math.abs(report.delta)}
            currency={currency}
            variant="titleMedium"
            style={{ color: saved ? theme.semantic.positive : theme.semantic.negative }}
          />
        </View>
      </View>

      {/* Key stats */}
      <View style={styles.statGrid}>
        <StatCard label={t('boxes.statSpent')} value={report.spent} currency={currency} />
        <StatCard label={t('boxes.statBudget')} value={box.budget_amount} currency={currency} />
        <StatCard label={t('boxes.statFunded')} value={box.funded} currency={currency} />
        <StatCard
          label={t('boxes.statLeftover')}
          value={box.balance}
          currency={currency}
          tone={box.balance < 0 ? 'negative' : undefined}
        />
      </View>

      {/* Daily spend chart */}
      {maxDay > 0 && (
        <Section title={t('boxes.dailySpend')}>
          <View onLayout={onChartLayout} style={{ paddingTop: 8 }}>
            {chartWidth > 0 && (
              <BarChart
                data={barData}
                width={chartWidth}
                height={150}
                barWidth={Math.max(8, Math.min(28, (chartWidth - 40) / Math.max(1, barData.length) - 6))}
                spacing={6}
                initialSpacing={10}
                endSpacing={10}
                noOfSections={3}
                hideRules
                yAxisThickness={0}
                xAxisThickness={0}
                barBorderRadius={3}
                formatYLabel={(v: string) => formatCompact(Number(v))}
                yAxisTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 9 }}
              />
            )}
          </View>
          <View style={styles.paceRow}>
            <Pace label={t('boxes.avgPerDay')} value={report.avgPerDay} currency={currency} />
            <Pace label={t('boxes.plannedPerDay')} value={report.plannedPerDay} currency={currency} />
            {report.peakDay && (
              <Pace label={t('boxes.peakDay')} value={report.peakDay.total} currency={currency} tone="negative" />
            )}
          </View>
        </Section>
      )}

      {/* Pre / post event spending */}
      {(report.preEventSpent > 0 || report.postEventSpent > 0) && (
        <Section title={t('boxes.report')}>
          {report.preEventSpent > 0 && (
            <BreakdownRow label={t('boxes.beforeEvent')} total={report.preEventSpent} share={null} currency={currency} />
          )}
          {report.postEventSpent > 0 && (
            <BreakdownRow label={t('boxes.afterEvent')} total={report.postEventSpent} share={null} currency={currency} />
          )}
        </Section>
      )}

      {/* Where it went — by category */}
      {report.byCategory.length > 0 && (
        <Section title={t('boxes.whereItWent')}>
          {report.byCategory.map((row, i) => (
            <BreakdownRow
              key={row.key ?? `none-${i}`}
              label={catName(row.key)}
              total={row.total}
              share={row.share}
              currency={currency}
              first={i === 0}
            />
          ))}
        </Section>
      )}

      {/* Top merchants inside the box */}
      {report.byMerchant.length > 0 && (
        <Section title={t('analytics.topMerchants')}>
          {report.byMerchant.slice(0, 6).map((row, i) => (
            <BreakdownRow
              key={row.key}
              label={row.key}
              total={row.total}
              share={row.share}
              currency={currency}
              first={i === 0}
            />
          ))}
        </Section>
      )}
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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

function StatCard({
  label,
  value,
  currency,
  tone,
}: {
  label: string;
  value: number;
  currency: string;
  tone?: 'negative';
}) {
  const theme = useTheme<AppTheme>();
  const { radius, spacing } = theme.tokens;
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: theme.colors.surface, borderRadius: radius.lg, padding: spacing.lg },
        theme.tokens.shadow.card,
      ]}
    >
      <Eyebrow>{label}</Eyebrow>
      <MoneyText
        value={value}
        currency={currency}
        variant="titleLarge"
        style={tone === 'negative' ? { color: theme.semantic.negative } : undefined}
      />
    </View>
  );
}

function Pace({
  label,
  value,
  currency,
  tone,
}: {
  label: string;
  value: number;
  currency: string;
  tone?: 'negative';
}) {
  const theme = useTheme<AppTheme>();
  return (
    <View style={styles.pace}>
      <Eyebrow>{label}</Eyebrow>
      <MoneyText
        value={value}
        currency={currency}
        variant="titleSmall"
        style={tone === 'negative' ? { color: theme.semantic.negative } : undefined}
      />
    </View>
  );
}

function BreakdownRow({
  label,
  total,
  share,
  currency,
  first,
}: {
  label: string;
  total: number;
  share: number | null;
  currency: string;
  first?: boolean;
}) {
  const theme = useTheme<AppTheme>();
  return (
    <View>
      {!first && <View style={[styles.rowDivider, { backgroundColor: theme.colors.outlineVariant }]} />}
      <View style={styles.breakdownRow}>
        <Text variant="bodyLarge" numberOfLines={1} style={{ flex: 1, color: theme.colors.onSurface }}>
          {label}
        </Text>
        {share != null && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {Math.round(share)}%
          </Text>
        )}
        <MoneyText value={total} currency={currency} variant="titleSmall" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  verdict: {},
  verdictHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  verdictIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  deltaLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flexGrow: 1, flexBasis: '46%', gap: 4 },
  paceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingTop: 12 },
  pace: { gap: 2, flex: 1 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowDivider: { height: StyleSheet.hairlineWidth },
});
