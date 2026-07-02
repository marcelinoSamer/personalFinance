import { StyleSheet, View, Pressable } from 'react-native';
import { Stack, router } from 'expo-router';
import { FAB, ProgressBar, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { MoneyText } from '@/components/MoneyText';
import { Eyebrow } from '@/components/Eyebrow';
import { EmptyState } from '@/components/EmptyState';
import { getLocale, t } from '@/i18n';
import { formatMoney } from '@/money/format';
import type { CurrencyCode } from '@/money/currencies';
import { formatDate } from '@/ui/date';
import { boxPhase, boxProgress, type BoxPhase } from '@/money/boxes';
import { listBoxes, type EventBoxView } from '@/db/repositories/boxes';
import { useAsyncData } from '@/state/dataVersion';
import type { AppTheme } from '@/theme';

const DAY = 86_400_000;

function money(value: number, currency: CurrencyCode): string {
  return formatMoney(value, currency, { arabicDigits: getLocale() === 'ar' });
}

const PHASE_ORDER: BoxPhase[] = ['active', 'upcoming', 'ended', 'closed'];

const PHASE_SECTION: Record<BoxPhase, string> = {
  active: 'boxes.sectionActive',
  upcoming: 'boxes.sectionUpcoming',
  ended: 'boxes.sectionEnded',
  closed: 'boxes.sectionClosed',
};

export default function BoxesScreen() {
  const theme = useTheme<AppTheme>();
  const { spacing } = theme.tokens;

  const { data: boxes, loading, reload } = useAsyncData(() => listBoxes());

  const groups = PHASE_ORDER.map((phase) => ({
    phase,
    items: (boxes ?? []).filter((b) => boxPhase(b) === phase),
  })).filter((g) => g.items.length > 0);

  return (
    <View style={styles.flex}>
      <Screen refreshing={loading} onRefresh={reload}>
        <Stack.Screen options={{ title: t('boxes.title') }} />
        {boxes && boxes.length === 0 && (
          <EmptyState icon="party-popper" text={t('boxes.empty')} />
        )}
        {groups.map((g) => (
          <View key={g.phase} style={{ gap: spacing.sm }}>
            <Eyebrow>{t(PHASE_SECTION[g.phase])}</Eyebrow>
            <View style={{ gap: spacing.md }}>
              {g.items.map((b) => (
                <BoxCard key={b.id} box={b} phase={g.phase} />
              ))}
            </View>
          </View>
        ))}
      </Screen>
      <FAB
        icon="plus"
        color={theme.colors.onPrimary}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push('/box-edit')}
      />
    </View>
  );
}

function BoxCard({ box, phase }: { box: EventBoxView; phase: BoxPhase }) {
  const theme = useTheme<AppTheme>();
  const { spacing, radius } = theme.tokens;
  const p = boxProgress({
    budget: box.budget_amount,
    funded: box.funded,
    spent: box.spent,
    returned: box.returned,
  });

  const accent = box.color ?? theme.colors.primary;
  const over = p.remainingBudget < 0;

  // Upcoming boxes show saving progress; running/finished ones show spending.
  const showFunding = phase === 'upcoming';
  const barValue = showFunding ? p.fundedPercent : p.spentPercent;
  const barColor = showFunding ? accent : over ? theme.semantic.negative : accent;

  let statusLine: string | null = null;
  const now = Date.now();
  if (phase === 'upcoming') {
    const days = Math.max(1, Math.ceil((box.starts_at - now) / DAY));
    statusLine = days === 1 ? t('boxes.dayToGo') : t('boxes.daysToGo', { days });
  } else if (phase === 'active') {
    const days = Math.max(0, Math.ceil((box.ends_at - now) / DAY));
    statusLine = days <= 1 ? t('boxes.dayLeft') : t('boxes.daysLeft', { days });
  } else if (phase === 'ended') {
    statusLine = t('boxes.eventOverSeeReport');
  }

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/box-detail', params: { id: box.id } })}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
        theme.tokens.shadow.card,
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.headRow}>
        <View style={[styles.chip, { backgroundColor: accent, borderRadius: radius.md }]}>
          <MaterialCommunityIcons name="party-popper" size={20} color="#fff" />
        </View>
        <View style={styles.headBody}>
          <Text variant="titleMedium" numberOfLines={1} style={{ color: theme.colors.onSurface }}>
            {box.name}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatDate(box.starts_at)} — {formatDate(box.ends_at)}
          </Text>
        </View>
        <MoneyText value={p.inBox} currency={box.currency} variant="titleMedium" />
      </View>

      <ProgressBar progress={Math.min(1, barValue / 100)} color={barColor} />
      <View style={styles.footRow}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontVariant: ['tabular-nums'] }}>
          {showFunding ? t('boxes.saved') : t('boxes.spent')}:{' '}
          {money(showFunding ? p.funded : p.spent, box.currency)} / {money(p.budget, box.currency)}
        </Text>
        {statusLine && (
          <Text variant="bodySmall" style={{ color: over ? theme.semantic.negative : theme.colors.onSurfaceVariant }}>
            {statusLine}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {},
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headBody: { flex: 1, gap: 2 },
  chip: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  footRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
