import { useEffect } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MoneyText } from '@/components/MoneyText';
import { Eyebrow } from '@/components/Eyebrow';
import { TransactionRow } from '@/components/TransactionRow';
import { EmptyState } from '@/components/EmptyState';
import { t } from '@/i18n';
import { convert } from '@/money/fx';
import { monthRange } from '@/ui/date';
import { sumByKindCurrency, listTransactions } from '@/db/repositories/transactions';
import { usePortfolio } from '@/state/portfolio';
import { useAsyncData } from '@/state/dataVersion';
import { checkBudgetsAndNotify } from '@/notifications/budgets';
import type { AppTheme } from '@/theme';

export default function DashboardScreen() {
  const theme = useTheme<AppTheme>();
  const { spacing, radius } = theme.tokens;
  const insets = useSafeAreaInsets();
  const { data: pf, loading, reload } = usePortfolio();

  const { data: extra } = useAsyncData(async () => {
    const range = monthRange();
    const [sums, recent] = await Promise.all([
      sumByKindCurrency(range.from, range.to),
      listTransactions({ limit: 6 }),
    ]);
    return { sums, recent };
  });

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

  useEffect(() => {
    checkBudgetsAndNotify().catch(() => {});
  }, []);

  const display = pf?.display ?? 'EGP';
  const empty = pf && pf.accounts.length === 0 && pf.assets.length === 0;
  const missing = pf?.netWorth.missing.length ?? 0;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: 112, gap: spacing.xxl }}
        refreshControl={
          <RefreshControl refreshing={!!loading} onRefresh={reload} tintColor={theme.colors.primary} />
        }
      >
        {/* Vault panel — net worth as a gold figure on an engraved gold line. */}
        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.sm }}>
          <View style={styles.offlineRow}>
            <MaterialCommunityIcons
              name="shield-lock-outline"
              size={13}
              color={theme.colors.onSurfaceVariant}
            />
            <Eyebrow>{t('more.offlineBadge')}</Eyebrow>
          </View>

          <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
            <Eyebrow>{t('dashboard.netWorth')}</Eyebrow>
            <MoneyText
              value={pf?.netWorth.total ?? 0}
              currency={display}
              tone="gold"
              variant="displaySmall"
              style={styles.heroFigure}
            />
            <View style={[styles.goldRule, { backgroundColor: theme.semantic.gold }]} />
          </View>

          <View style={[styles.splitRow, { marginTop: spacing.xs }]}>
            <View style={{ gap: 2 }}>
              <Eyebrow>{t('accounts.containers')}</Eyebrow>
              <MoneyText value={pf?.netWorth.cash ?? 0} currency={display} variant="titleSmall" />
            </View>
            <View style={{ gap: 2 }}>
              <Eyebrow>{t('accounts.assets')}</Eyebrow>
              <MoneyText value={pf?.netWorth.assets ?? 0} currency={display} variant="titleSmall" />
            </View>
          </View>

          {missing > 0 && (
            <Pressable
              onPress={() => router.push('/fx-rates')}
              style={[
                styles.warnPill,
                { backgroundColor: theme.colors.surfaceVariant, borderRadius: radius.pill, marginTop: spacing.sm },
              ]}
            >
              <MaterialCommunityIcons name="alert-outline" size={15} color={theme.semantic.negative} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {t('dashboard.missingRates')}
              </Text>
            </Pressable>
          )}
        </View>

        {/* This month */}
        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.sm }}>
          <Eyebrow>{t('dashboard.thisMonth')}</Eyebrow>
          <View
            style={[
              styles.monthCard,
              { backgroundColor: theme.colors.surface, borderRadius: radius.lg, padding: spacing.lg },
              theme.tokens.shadow.card,
            ]}
          >
            <View style={styles.monthCol}>
              <Eyebrow>{t('dashboard.income')}</Eyebrow>
              <MoneyText
                value={income}
                currency={display}
                variant="titleLarge"
                style={{ color: theme.semantic.income }}
              />
            </View>
            <View style={[styles.vRule, { backgroundColor: theme.colors.outlineVariant }]} />
            <View style={styles.monthCol}>
              <Eyebrow>{t('dashboard.expenses')}</Eyebrow>
              <MoneyText
                value={expense}
                currency={display}
                variant="titleLarge"
                style={{ color: theme.semantic.expense }}
              />
            </View>
          </View>
        </View>

        {/* Quick actions */}
        <View style={[styles.actionRow, { paddingHorizontal: spacing.xl, gap: spacing.md }]}>
          <ActionTile
            icon="arrow-bottom-left"
            tint={theme.semantic.income}
            label={t('dashboard.addIncome')}
            onPress={() => router.push({ pathname: '/transaction-edit', params: { kind: 'income' } })}
          />
          <ActionTile
            icon="arrow-top-right"
            tint={theme.semantic.expense}
            label={t('dashboard.addExpense')}
            onPress={() => router.push({ pathname: '/transaction-edit', params: { kind: 'expense' } })}
          />
          <ActionTile
            icon="swap-horizontal"
            tint={theme.colors.primary}
            label={t('dashboard.transfer')}
            onPress={() => router.push('/transfer')}
          />
        </View>

        {empty && (
          <View style={{ paddingHorizontal: spacing.xl }}>
            <EmptyState icon="bank-plus" text={t('accounts.noContainers')} />
          </View>
        )}

        {/* Containers — horizontal carousel breaks the vertical card stack. */}
        {pf && pf.accounts.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <Eyebrow style={{ paddingHorizontal: spacing.xl }}>{t('dashboard.balances')}</Eyebrow>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.md }}
            >
              {pf.accounts.map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => router.push({ pathname: '/account-edit', params: { id: a.id } })}
                  style={[
                    styles.balCard,
                    { backgroundColor: theme.colors.surface, borderRadius: radius.lg, padding: spacing.lg },
                    theme.tokens.shadow.card,
                  ]}
                >
                  <View
                    style={[
                      styles.balChip,
                      { backgroundColor: a.color ?? theme.colors.primary, borderRadius: radius.md },
                    ]}
                  >
                    <MaterialCommunityIcons name={(a.icon ?? 'wallet') as never} size={20} color="#fff" />
                  </View>
                  <View style={{ gap: 2 }}>
                    <Text variant="titleSmall" numberOfLines={1} style={{ color: theme.colors.onSurface }}>
                      {a.name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {a.currency}
                    </Text>
                  </View>
                  <MoneyText value={a.balance} currency={a.currency} variant="titleMedium" />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recent */}
        {extra && extra.recent.length > 0 && (
          <View style={{ paddingHorizontal: spacing.xl, gap: spacing.sm }}>
            <Eyebrow>{t('dashboard.recent')}</Eyebrow>
            <View
              style={[
                styles.listCard,
                { backgroundColor: theme.colors.surface, borderRadius: radius.lg },
                theme.tokens.shadow.card,
              ]}
            >
              {extra.recent.map((tx, i) => (
                <View key={tx.id}>
                  {i > 0 && (
                    <View style={[styles.hairline, { backgroundColor: theme.colors.outlineVariant }]} />
                  )}
                  <TransactionRow
                    tx={tx}
                    onPress={() => router.push({ pathname: '/transaction-edit', params: { id: tx.id } })}
                  />
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ActionTile({
  icon,
  tint,
  label,
  onPress,
}: {
  icon: string;
  tint: string;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme<AppTheme>();
  const { spacing, radius } = theme.tokens;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: radius.lg,
          paddingVertical: spacing.md,
          gap: spacing.sm,
          opacity: pressed ? 0.7 : 1,
        },
        theme.tokens.shadow.card,
      ]}
    >
      <View
        style={[styles.tileChip, { backgroundColor: theme.colors.surfaceVariant, borderRadius: radius.md }]}
      >
        <MaterialCommunityIcons name={icon as never} size={22} color={tint} />
      </View>
      <Text variant="labelMedium" style={{ color: theme.colors.onSurface }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  offlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroFigure: { fontSize: 40, lineHeight: 46, letterSpacing: -0.5 },
  goldRule: { width: 48, height: 2, borderRadius: 1, marginTop: 6 },
  splitRow: { flexDirection: 'row', gap: 32 },
  warnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  monthCard: { flexDirection: 'row', alignItems: 'center' },
  monthCol: { flex: 1, alignItems: 'center', gap: 4 },
  vRule: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 4 },
  actionRow: { flexDirection: 'row' },
  tile: { flex: 1, alignItems: 'center' },
  tileChip: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  balCard: { width: 170, gap: 12 },
  balChip: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  listCard: { overflow: 'hidden' },
  hairline: { height: StyleSheet.hairlineWidth, marginLeft: 76 },
});
