import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { FAB, SegmentedButtons, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { MoneyText } from '@/components/MoneyText';
import { Eyebrow } from '@/components/Eyebrow';
import { EmptyState } from '@/components/EmptyState';
import { t } from '@/i18n';
import { assetTypeLabel, accountTypeLabel } from '@/ui/labels';
import { ASSET_TYPE_META } from '@/ui/meta';
import { usePortfolio } from '@/state/portfolio';
import type { CurrencyCode } from '@/money/currencies';
import type { AppTheme } from '@/theme';

type Segment = 'containers' | 'assets';

export default function AccountsScreen() {
  const theme = useTheme<AppTheme>();
  const { spacing, radius } = theme.tokens;
  const [segment, setSegment] = useState<Segment>('containers');
  const { data: pf, loading, reload } = usePortfolio();

  const containerCount = pf?.accounts.length ?? 0;
  const assetCount = pf?.assets.length ?? 0;

  const containerCurrencies = useMemo(() => {
    if (!pf) return [] as CurrencyCode[];
    return [...new Set(pf.accounts.map((a) => a.currency))];
  }, [pf]);
  const assetCurrencies = useMemo(() => {
    if (!pf) return [] as CurrencyCode[];
    return [...new Set(pf.assets.map((a) => a.currency))];
  }, [pf]);

  const showingContainers = segment === 'containers';
  const total = showingContainers ? pf?.netWorth.cash ?? 0 : pf?.netWorth.assets ?? 0;
  const count = showingContainers ? containerCount : assetCount;
  const currencies = showingContainers ? containerCurrencies : assetCurrencies;
  const display = pf?.display ?? 'EGP';
  // Assets are stored value (incl. gold/silver) — mark their total in gold.
  const valueTone = !showingContainers;

  const countLabel =
    count === 1
      ? t(showingContainers ? 'accounts.countContainersOne' : 'accounts.countAssetsOne')
      : t(showingContainers ? 'accounts.countContainers' : 'accounts.countAssets', { count });

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: 112, gap: spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={!!loading} onRefresh={reload} tintColor={theme.colors.primary} />
        }
      >
        <SegmentedButtons
          value={segment}
          onValueChange={(v) => setSegment(v as Segment)}
          buttons={[
            { value: 'containers', label: t('accounts.containers'), icon: 'wallet' },
            { value: 'assets', label: t('accounts.assets'), icon: 'gold' },
          ]}
        />

        {count > 0 && (
          <View style={{ gap: spacing.xs }}>
            <Eyebrow>{t('accounts.totalInCurrency', { currency: display })}</Eyebrow>
            <MoneyText
              value={total}
              currency={display}
              tone={valueTone ? 'gold' : undefined}
              variant="displaySmall"
              style={styles.heroFigure}
            />
            <View
              style={[
                styles.rule,
                { backgroundColor: valueTone ? theme.semantic.gold : theme.colors.outlineVariant },
              ]}
            />
            <View style={[styles.metaRow, { marginTop: spacing.xs }]}>
              <Eyebrow>{countLabel}</Eyebrow>
              {currencies.length > 1 && <Eyebrow>{currencies.join('  ·  ')}</Eyebrow>}
            </View>
          </View>
        )}

        {showingContainers &&
          (containerCount > 0 ? (
            <View
              style={[
                styles.listCard,
                { backgroundColor: theme.colors.surface, borderRadius: radius.lg },
                theme.tokens.shadow.card,
              ]}
            >
              {pf!.accounts.map((a, i) => (
                <Row
                  key={a.id}
                  first={i === 0}
                  icon={a.icon ?? 'wallet'}
                  chipColor={a.color ?? theme.colors.primary}
                  title={a.name}
                  subtitle={`${accountTypeLabel(a.type)}  ·  ${a.currency}`}
                  amount={a.balance}
                  currency={a.currency}
                  onPress={() => router.push({ pathname: '/account-edit', params: { id: a.id } })}
                />
              ))}
            </View>
          ) : (
            <EmptyState icon="wallet-outline" text={t('accounts.noContainers')} />
          ))}

        {!showingContainers &&
          (assetCount > 0 ? (
            <View
              style={[
                styles.listCard,
                { backgroundColor: theme.colors.surface, borderRadius: radius.lg },
                theme.tokens.shadow.card,
              ]}
            >
              {pf!.assets.map((a, i) => (
                <Row
                  key={a.id}
                  first={i === 0}
                  icon={ASSET_TYPE_META[a.type].icon}
                  chipColor={ASSET_TYPE_META[a.type].color}
                  title={a.name}
                  subtitle={`${assetTypeLabel(a.type)}${a.unit ? `  ·  ${a.quantity} ${a.unit}` : ''}`}
                  amount={a.value}
                  currency={a.currency}
                  onPress={() => router.push({ pathname: '/asset-edit', params: { id: a.id } })}
                />
              ))}
            </View>
          ) : (
            <EmptyState icon="gold" text={t('accounts.noAssets')} />
          ))}
      </ScrollView>

      <FAB
        icon="plus"
        color={theme.colors.onPrimary}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push(showingContainers ? '/account-edit' : '/asset-edit')}
      />
    </View>
  );
}

function Row({
  first,
  icon,
  chipColor,
  title,
  subtitle,
  amount,
  currency,
  onPress,
}: {
  first: boolean;
  icon: string;
  chipColor: string;
  title: string;
  subtitle: string;
  amount: number;
  currency: CurrencyCode;
  onPress: () => void;
}) {
  const theme = useTheme<AppTheme>();
  const { spacing, radius } = theme.tokens;
  return (
    <View>
      {!first && <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.md },
          pressed && { backgroundColor: theme.colors.surfaceVariant },
        ]}
      >
        <View style={[styles.chip, { backgroundColor: chipColor, borderRadius: radius.md }]}>
          <MaterialCommunityIcons name={icon as never} size={20} color="#fff" />
        </View>
        <View style={styles.body}>
          <Text variant="titleSmall" numberOfLines={1} style={{ color: theme.colors.onSurface }}>
            {title}
          </Text>
          <Text variant="bodySmall" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>
            {subtitle}
          </Text>
        </View>
        <MoneyText value={amount} currency={currency} variant="titleMedium" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  heroFigure: { fontSize: 40, lineHeight: 46, letterSpacing: -0.5 },
  rule: { width: 48, height: 2, borderRadius: 1, marginTop: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  listCard: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
  chip: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 76 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
