import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Divider, FAB, SegmentedButtons, Searchbar } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { TransactionRow } from '@/components/TransactionRow';
import { EmptyState } from '@/components/EmptyState';
import { t } from '@/i18n';
import { listTransactions } from '@/db/repositories/transactions';
import { useAsyncData } from '@/state/dataVersion';
import type { TxKind } from '@/db/schema';

type KindFilter = 'all' | TxKind;

export default function TransactionsScreen() {
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<KindFilter>('all');

  const { data: txs, loading, reload } = useAsyncData(
    () =>
      listTransactions({
        search: search.trim() || undefined,
        kind: kind === 'all' ? undefined : kind,
        limit: 300,
      }),
    [search, kind],
  );

  return (
    <View style={styles.flex}>
      <Screen refreshing={loading} onRefresh={reload}>
        <Searchbar placeholder={t('common.search')} value={search} onChangeText={setSearch} />
        <SegmentedButtons
          value={kind}
          onValueChange={(v) => setKind(v as KindFilter)}
          buttons={[
            { value: 'all', label: t('common.all') },
            { value: 'income', label: t('tx.income') },
            { value: 'expense', label: t('tx.expense') },
          ]}
        />

        {txs && txs.length > 0 ? (
          txs.map((tx, i) => (
            <View key={tx.id}>
              {i > 0 && <Divider />}
              <TransactionRow
                tx={tx}
                onPress={() => router.push({ pathname: '/transaction-edit', params: { id: tx.id } })}
              />
            </View>
          ))
        ) : (
          <EmptyState icon="swap-vertical" text={t('tx.noTransactions')} />
        )}
      </Screen>

      <FAB icon="plus" style={styles.fab} onPress={() => router.push('/transaction-edit')} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
