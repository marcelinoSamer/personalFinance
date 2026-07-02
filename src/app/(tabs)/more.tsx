import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { List, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import { Eyebrow } from '@/components/Eyebrow';
import { t } from '@/i18n';
import { useSettings } from '@/state/settings';
import type { AppTheme } from '@/theme';

interface Row {
  title: string;
  description: string;
  icon: string;
  route: string;
}

interface Group {
  title: string;
  rows: Row[];
}

export default function MoreScreen() {
  const theme = useTheme<AppTheme>();
  const displayCurrency = useSettings((s) => s.displayCurrency);
  const locale = useSettings((s) => s.locale);
  const localeLabel = locale === 'ar' ? 'العربية' : 'English';

  const groups: Group[] = [
    {
      title: t('more.sectionPersonal'),
      rows: [
        {
          title: t('more.accountSettings'),
          description: `${displayCurrency} · ${localeLabel}`,
          icon: 'account-cog-outline',
          route: '/settings',
        },
      ],
    },
    {
      title: t('more.sectionPlanning'),
      rows: [
        {
          title: t('budgets.title'),
          description: t('more.budgetsDesc'),
          icon: 'chart-donut',
          route: '/budgets',
        },
        {
          title: t('goals.title'),
          description: t('more.goalsDesc'),
          icon: 'target',
          route: '/goals',
        },
        {
          title: t('boxes.title'),
          description: t('more.boxesDesc'),
          icon: 'party-popper',
          route: '/boxes',
        },
      ],
    },
    {
      title: t('more.sectionData'),
      rows: [
        {
          title: t('fx.title'),
          description: t('more.fxDesc'),
          icon: 'swap-horizontal',
          route: '/fx-rates',
        },
        {
          title: t('sms.title'),
          description: t('more.smsDesc'),
          icon: 'message-text-outline',
          route: '/sms',
        },
      ],
    },
  ];

  return (
    <Screen>
      <View style={[styles.offlineBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
        <MaterialCommunityIcons
          name="shield-lock-outline"
          size={16}
          color={theme.colors.onSurfaceVariant}
        />
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {t('more.offlineBadge')}
        </Text>
      </View>

      {groups.map((group) => (
        <View key={group.title} style={styles.group}>
          <Eyebrow style={styles.groupTitle}>{group.title}</Eyebrow>
          <View
            style={[
              styles.groupCard,
              { backgroundColor: theme.colors.surface },
              theme.tokens.shadow.card,
            ]}
          >
            {group.rows.map((row, i) => (
              <View key={row.title}>
                {i > 0 && (
                  <View
                    style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]}
                  />
                )}
                <List.Item
                  title={row.title}
                  description={row.description}
                  descriptionNumberOfLines={2}
                  left={() => (
                    <View style={styles.iconBox}>
                      <MaterialCommunityIcons
                        name={row.icon as never}
                        size={22}
                        color={theme.colors.primary}
                      />
                    </View>
                  )}
                  right={() => (
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={22}
                      color={theme.colors.onSurfaceVariant}
                      style={styles.chevron}
                    />
                  )}
                  onPress={() => router.push(row.route as never)}
                />
              </View>
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  group: { gap: 10 },
  groupTitle: { paddingHorizontal: 4 },
  groupCard: { borderRadius: 20, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 64 },
  iconBox: { width: 40, alignItems: 'center', justifyContent: 'center' },
  chevron: { alignSelf: 'center' },
});
