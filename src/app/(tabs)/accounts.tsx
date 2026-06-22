import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Avatar, FAB, List, SegmentedButtons } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { MoneyText } from '@/components/MoneyText';
import { EmptyState } from '@/components/EmptyState';
import { t } from '@/i18n';
import { assetTypeLabel, accountTypeLabel } from '@/ui/labels';
import { ASSET_TYPE_META } from '@/ui/meta';
import { usePortfolio } from '@/state/portfolio';

type Segment = 'containers' | 'assets';

export default function AccountsScreen() {
  const [segment, setSegment] = useState<Segment>('containers');
  const { data: pf, loading, reload } = usePortfolio();

  return (
    <View style={styles.flex}>
      <Screen refreshing={loading} onRefresh={reload}>
        <SegmentedButtons
          value={segment}
          onValueChange={(v) => setSegment(v as Segment)}
          buttons={[
            { value: 'containers', label: t('accounts.containers'), icon: 'wallet' },
            { value: 'assets', label: t('accounts.assets'), icon: 'gold' },
          ]}
        />

        {segment === 'containers' &&
          (pf && pf.accounts.length > 0 ? (
            <List.Section>
              {pf.accounts.map((a) => (
                <List.Item
                  key={a.id}
                  title={a.name}
                  description={`${accountTypeLabel(a.type)} · ${a.currency}`}
                  left={() => <Avatar.Icon size={40} icon={a.icon ?? 'wallet'} style={{ backgroundColor: a.color ?? undefined }} color="#fff" />}
                  right={() => <MoneyText value={a.balance} currency={a.currency} />}
                  onPress={() => router.push({ pathname: '/account-edit', params: { id: a.id } })}
                />
              ))}
            </List.Section>
          ) : (
            <EmptyState icon="wallet-outline" text={t('accounts.noContainers')} />
          ))}

        {segment === 'assets' &&
          (pf && pf.assets.length > 0 ? (
            <List.Section>
              {pf.assets.map((a) => (
                <List.Item
                  key={a.id}
                  title={a.name}
                  description={`${assetTypeLabel(a.type)}${a.unit ? ` · ${a.quantity} ${a.unit}` : ''}`}
                  left={() => (
                    <Avatar.Icon
                      size={40}
                      icon={ASSET_TYPE_META[a.type].icon}
                      style={{ backgroundColor: ASSET_TYPE_META[a.type].color }}
                      color="#fff"
                    />
                  )}
                  right={() => <MoneyText value={a.value} currency={a.currency} />}
                  onPress={() => router.push({ pathname: '/asset-edit', params: { id: a.id } })}
                />
              ))}
            </List.Section>
          ) : (
            <EmptyState icon="gold" text={t('accounts.noAssets')} />
          ))}
      </Screen>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() =>
          router.push(segment === 'containers' ? '/account-edit' : '/asset-edit')
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
