import { StyleSheet, View, Pressable, Alert } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Button, ProgressBar, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { MoneyText } from '@/components/MoneyText';
import { Eyebrow } from '@/components/Eyebrow';
import { TransactionRow } from '@/components/TransactionRow';
import { t } from '@/i18n';
import { formatDate } from '@/ui/date';
import { boxPhase, boxProgress } from '@/money/boxes';
import { getBox, closeBox, reopenBox } from '@/db/repositories/boxes';
import { listTransactions } from '@/db/repositories/transactions';
import { listTransfersForAccount } from '@/db/repositories/transfers';
import { useAsyncData } from '@/state/dataVersion';
import { bumpData } from '@/state/dataVersion';
import type { AppTheme } from '@/theme';

const DAY = 86_400_000;

export default function BoxDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme<AppTheme>();
  const { spacing, radius } = theme.tokens;

  const { data } = useAsyncData(async () => {
    if (!id) return null;
    const box = await getBox(id);
    if (!box) return null;
    const [txs, transfers] = await Promise.all([
      listTransactions({ accountId: box.account_id, limit: 200 }),
      listTransfersForAccount(box.account_id),
    ]);
    return { box, txs, transfers };
  }, [id]);

  if (!data || !data.box) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('boxes.title') }} />
      </Screen>
    );
  }

  const { box, txs, transfers } = data;
  const phase = boxPhase(box);
  const p = boxProgress({
    budget: box.budget_amount,
    funded: box.funded,
    spent: box.spent,
    returned: box.returned,
  });
  const accent = box.color ?? theme.colors.primary;
  const over = p.remainingBudget < 0;
  const showFunding = phase === 'upcoming';
  const barValue = showFunding ? p.fundedPercent : p.spentPercent;
  const barColor = showFunding ? accent : over ? theme.semantic.negative : accent;

  const now = Date.now();
  let statusLine = '';
  if (phase === 'upcoming') {
    const days = Math.max(1, Math.ceil((box.starts_at - now) / DAY));
    statusLine = days === 1 ? t('boxes.dayToGo') : t('boxes.daysToGo', { days });
  } else if (phase === 'active') {
    const days = Math.max(0, Math.ceil((box.ends_at - now) / DAY));
    statusLine = days <= 1 ? t('boxes.dayLeft') : t('boxes.daysLeft', { days });
  } else {
    statusLine = phase === 'closed' ? t('boxes.phaseClosed') : t('boxes.phaseEnded');
  }

  const onClose = () => {
    const doClose = () =>
      Alert.alert(t('boxes.closeBox'), t('boxes.closeConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('boxes.closeBox'),
          onPress: async () => {
            await closeBox(box.id);
            bumpData();
          },
        },
      ]);
    if (p.inBox > 0.005) {
      Alert.alert(t('boxes.closeBox'), t('boxes.closeLeftoverWarn'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('boxes.returnLeftover'),
          onPress: () => router.push({ pathname: '/box-fund', params: { id: box.id, mode: 'return' } }),
        },
        { text: t('boxes.closeAnyway'), style: 'destructive', onPress: doClose },
      ]);
    } else {
      doClose();
    }
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: box.name,
          headerRight: () => (
            <Pressable
              onPress={() => router.push({ pathname: '/box-edit', params: { id: box.id } })}
              hitSlop={12}
            >
              <MaterialCommunityIcons name="pencil-outline" size={22} color={theme.colors.onSurface} />
            </Pressable>
          ),
        }}
      />

      {/* Vault-style panel: the in-box figure over an accent rule. */}
      <View
        style={[
          styles.hero,
          { backgroundColor: theme.colors.surface, borderRadius: radius.lg, padding: spacing.xl },
          theme.tokens.shadow.card,
        ]}
      >
        <View style={styles.heroTop}>
          <Eyebrow>{t(`boxes.phase${cap(phase)}`)}</Eyebrow>
          <Text variant="bodySmall" style={{ color: over ? theme.semantic.negative : theme.colors.onSurfaceVariant }}>
            {statusLine}
          </Text>
        </View>
        <Eyebrow>{t('boxes.inBox')}</Eyebrow>
        <MoneyText value={p.inBox} currency={box.currency} variant="displaySmall" style={styles.heroFigure} />
        <View style={[styles.rule, { backgroundColor: accent }]} />
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {formatDate(box.starts_at)} — {formatDate(box.ends_at)}
        </Text>

        <ProgressBar
          progress={Math.min(1, barValue / 100)}
          color={barColor}
          style={{ marginTop: spacing.md, height: 6, borderRadius: 3 }}
        />
        <View style={styles.statRow}>
          <Stat label={t('boxes.spent')} value={box.spent} currency={box.currency} />
          <Stat label={t('boxes.saved')} value={box.funded} currency={box.currency} />
          <Stat label={t('boxes.budget')} value={box.budget_amount} currency={box.currency} />
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {phase !== 'closed' && (
          <Button
            mode="contained"
            icon="plus"
            onPress={() => router.push({ pathname: '/box-fund', params: { id: box.id } })}
          >
            {t('boxes.addMoney')}
          </Button>
        )}
        {(phase === 'active' || phase === 'upcoming') && (
          <Button
            mode="contained-tonal"
            icon="cart-outline"
            onPress={() =>
              router.push({ pathname: '/transaction-edit', params: { kind: 'expense', boxId: box.id } })
            }
          >
            {t('boxes.addExpense')}
          </Button>
        )}
        <Button
          mode="contained-tonal"
          icon="chart-box-outline"
          onPress={() => router.push({ pathname: '/box-report', params: { id: box.id } })}
        >
          {t('boxes.viewReport')}
        </Button>
        {phase !== 'closed' && p.inBox > 0.005 && (
          <Button
            mode="outlined"
            icon="arrow-u-left-top"
            onPress={() => router.push({ pathname: '/box-fund', params: { id: box.id, mode: 'return' } })}
          >
            {t('boxes.returnLeftover')}
          </Button>
        )}
        {phase === 'closed' ? (
          <Button mode="outlined" icon="lock-open-variant-outline" onPress={async () => { await reopenBox(box.id); bumpData(); }}>
            {t('boxes.reopen')}
          </Button>
        ) : (
          <Button mode="outlined" icon="lock-outline" onPress={onClose}>
            {t('boxes.closeBox')}
          </Button>
        )}
      </View>

      {/* Money in & out */}
      {transfers.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Eyebrow>{t('boxes.moneyIn')}</Eyebrow>
          <View style={[styles.listCard, { backgroundColor: theme.colors.surface, borderRadius: radius.lg }, theme.tokens.shadow.card]}>
            {transfers.map((tr, i) => {
              const into = tr.to_account_id === box.account_id;
              const otherName = into ? tr.from_name : tr.to_name;
              const amount = into ? tr.to_amount : tr.from_amount;
              const otherCurrency = into ? tr.from_currency : tr.to_currency;
              return (
                <View key={tr.id}>
                  {i > 0 && <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />}
                  <View style={[styles.moveRow, { paddingVertical: spacing.md, paddingHorizontal: spacing.lg }]}>
                    <View style={[styles.moveIcon, { backgroundColor: theme.colors.surfaceVariant, borderRadius: radius.md }]}>
                      <MaterialCommunityIcons
                        name={into ? 'arrow-bottom-left' : 'arrow-top-right'}
                        size={18}
                        color={into ? theme.semantic.positive : theme.semantic.negative}
                      />
                    </View>
                    <View style={styles.moveBody}>
                      <Text variant="titleSmall" numberOfLines={1} style={{ color: theme.colors.onSurface }}>
                        {into ? t('boxes.fundedEntry', { name: otherName }) : t('boxes.returnedEntry', { name: otherName })}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {formatDate(tr.occurred_at)}
                        {otherCurrency !== box.currency ? `  ·  ${otherCurrency}` : ''}
                      </Text>
                    </View>
                    <MoneyText value={into ? amount : -amount} currency={box.currency} colorBySign signed variant="titleSmall" />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Spending */}
      <View style={{ gap: spacing.sm }}>
        <Eyebrow>{t('boxes.spending')}</Eyebrow>
        {txs.length === 0 ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, paddingHorizontal: spacing.xs }}>
            {t('boxes.noSpending')}
          </Text>
        ) : (
          <View style={[styles.listCard, { backgroundColor: theme.colors.surface, borderRadius: radius.lg }, theme.tokens.shadow.card]}>
            {txs.map((tx, i) => (
              <View key={tx.id}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />}
                <TransactionRow
                  tx={tx}
                  onPress={() => router.push({ pathname: '/transaction-edit', params: { id: tx.id } })}
                />
              </View>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

function Stat({ label, value, currency }: { label: string; value: number; currency: string }) {
  const theme = useTheme<AppTheme>();
  return (
    <View style={styles.stat}>
      <Eyebrow>{label}</Eyebrow>
      <MoneyText value={value} currency={currency} variant="titleSmall" />
    </View>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  hero: {},
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  heroFigure: { fontSize: 40, lineHeight: 46, letterSpacing: -0.5, marginTop: 2 },
  rule: { width: 48, height: 2, borderRadius: 1, marginVertical: 8 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 12 },
  stat: { gap: 2, flex: 1 },
  actions: { gap: 8 },
  listCard: { overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 68 },
  moveRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  moveIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  moveBody: { flex: 1, gap: 2 },
});
