import { useMemo, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { FAB, SegmentedButtons, Searchbar, Text, useTheme } from 'react-native-paper';

import { MoneyText } from '@/components/MoneyText';
import { Eyebrow } from '@/components/Eyebrow';
import { TransactionRow } from '@/components/TransactionRow';
import { EmptyState } from '@/components/EmptyState';
import { t } from '@/i18n';
import { listTransactions, type TransactionView } from '@/db/repositories/transactions';
import { useAsyncData } from '@/state/dataVersion';
import { usePortfolio } from '@/state/portfolio';
import { convert } from '@/money/fx';
import { dayKey, formatDayHeader } from '@/ui/date';
import type { TxKind } from '@/db/schema';
import type { AppTheme } from '@/theme';

type KindFilter = 'all' | TxKind;

interface DaySection {
  dayTs: number;
  title: string;
  net: number;
  data: TransactionView[];
}

export default function TransactionsScreen() {
  const theme = useTheme<AppTheme>();
  const { spacing, radius } = theme.tokens;
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');
  const { data: pf } = usePortfolio();

  const { data: txs, loading, reload } = useAsyncData(
    () =>
      listTransactions({
        search: search.trim() || undefined,
        kind: kind === 'all' ? undefined : kind,
        limit: 300,
      }),
    [search, kind],
  );

  const sections = useMemo<DaySection[]>(() => {
    if (!txs) return [];
    const groups = new Map<number, DaySection>();
    for (const tx of txs) {
      const k = dayKey(tx.occurred_at);
      let g = groups.get(k);
      if (!g) {
        g = { dayTs: k, title: formatDayHeader(tx.occurred_at), net: 0, data: [] };
        groups.set(k, g);
      }
      g.data.push(tx);
      if (pf) {
        const converted = convert(tx.amount, tx.currency, pf.display, pf.lookup, pf.display);
        if (converted.value != null) {
          g.net += tx.kind === 'income' ? converted.value : -converted.value;
        }
      }
    }
    return [...groups.values()].sort((a, b) => b.dayTs - a.dayTs);
  }, [txs, pf]);

  // Income / expense totals across the currently filtered list (display currency).
  const summary = useMemo(() => {
    if (!txs || !pf) return null;
    let income = 0;
    let expense = 0;
    for (const tx of txs) {
      const c = convert(tx.amount, tx.currency, pf.display, pf.lookup, pf.display);
      if (c.value == null) continue;
      if (tx.kind === 'income') income += c.value;
      else expense += c.value;
    }
    return { income, expense };
  }, [txs, pf]);

  const displayCurrency = pf?.display ?? 'EGP';
  const isEmpty = txs && txs.length === 0;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.toolbar, { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.md }]}>
        <Searchbar
          placeholder={t('common.search')}
          value={search}
          onChangeText={setSearch}
          mode="bar"
          elevation={0}
          style={[styles.search, { backgroundColor: theme.colors.surface, borderRadius: radius.md }]}
          inputStyle={styles.searchInput}
        />
        <SegmentedButtons
          value={kind}
          onValueChange={(v) => setKind(v as KindFilter)}
          buttons={[
            { value: 'all', label: t('common.all') },
            { value: 'income', label: t('tx.income') },
            { value: 'expense', label: t('tx.expense') },
          ]}
        />
      </View>

      {isEmpty ? (
        <View style={styles.emptyWrap}>
          <EmptyState icon="swap-vertical" text={t('tx.noTransactions')} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 112 }}
          refreshControl={
            <RefreshControl refreshing={!!loading} onRefresh={reload} tintColor={theme.colors.primary} />
          }
          ListHeaderComponent={
            summary ? (
              <View
                style={[
                  styles.summaryCard,
                  { backgroundColor: theme.colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
                  theme.tokens.shadow.card,
                ]}
              >
                <View style={styles.summaryCol}>
                  <Eyebrow>{t('dashboard.income')}</Eyebrow>
                  <MoneyText
                    value={summary.income}
                    currency={displayCurrency}
                    variant="titleLarge"
                    style={{ color: theme.semantic.income }}
                  />
                </View>
                <View style={[styles.vRule, { backgroundColor: theme.colors.outlineVariant }]} />
                <View style={styles.summaryCol}>
                  <Eyebrow>{t('dashboard.expenses')}</Eyebrow>
                  <MoneyText
                    value={summary.expense}
                    currency={displayCurrency}
                    variant="titleLarge"
                    style={{ color: theme.semantic.expense }}
                  />
                </View>
              </View>
            ) : null
          }
          renderSectionHeader={({ section }) => (
            <View style={[styles.dayHeader, { backgroundColor: theme.colors.background, paddingVertical: spacing.sm }]}>
              <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
                {section.title}
              </Text>
              <View style={styles.dayHeaderRight}>
                <Eyebrow>{t('tx.dayNet')}</Eyebrow>
                <MoneyText
                  value={section.net}
                  currency={displayCurrency}
                  colorBySign
                  signed
                  variant="bodyMedium"
                />
              </View>
            </View>
          )}
          renderItem={({ item, index, section }) => (
            <View
              style={[
                { backgroundColor: theme.colors.surface },
                index === 0 && { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
                index === section.data.length - 1 && {
                  borderBottomLeftRadius: radius.lg,
                  borderBottomRightRadius: radius.lg,
                },
              ]}
            >
              {index > 0 && (
                <View style={[styles.rowDivider, { backgroundColor: theme.colors.outlineVariant }]} />
              )}
              <TransactionRow
                tx={item}
                onPress={() => router.push({ pathname: '/transaction-edit', params: { id: item.id } })}
              />
            </View>
          )}
          renderSectionFooter={() => <View style={styles.sectionFooter} />}
        />
      )}

      <FAB
        icon="plus"
        color={theme.colors.onPrimary}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push('/transaction-edit')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  toolbar: { paddingBottom: 8 },
  search: {},
  searchInput: { minHeight: 0 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryCard: { flexDirection: 'row', alignItems: 'center' },
  summaryCol: { flex: 1, alignItems: 'center', gap: 4 },
  vRule: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 4 },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  dayHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowDivider: { height: StyleSheet.hairlineWidth, marginLeft: 76 },
  sectionFooter: { height: 12 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
