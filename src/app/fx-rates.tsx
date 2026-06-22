import { useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Button, Dialog, FAB, IconButton, List, Portal } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';
import { AmountInput } from '@/components/AmountInput';
import { SelectField } from '@/components/SelectField';
import { t } from '@/i18n';
import { formatNumber } from '@/money/format';
import { parseAmount } from '@/ui/number';
import { CASH_CURRENCY_CODES, currencyMeta, type CurrencyCode } from '@/money/currencies';
import { formatDate } from '@/ui/date';
import { deleteRate, listRates, upsertRate } from '@/db/repositories/fxRates';
import { useAsyncData, bumpData } from '@/state/dataVersion';

const CURRENCY_OPTIONS = [...CASH_CURRENCY_CODES, 'XAU', 'XAG'].map((c) => ({
  key: c,
  label: `${c} — ${currencyMeta(c).symbol}`,
}));

export default function FxRatesScreen() {
  const { data: rates } = useAsyncData(listRates);
  const [dialog, setDialog] = useState(false);
  const [base, setBase] = useState<CurrencyCode>('USD');
  const [quote, setQuote] = useState<CurrencyCode>('EGP');
  const [rate, setRate] = useState('');

  const openAdd = () => {
    setBase('USD');
    setQuote('EGP');
    setRate('');
    setDialog(true);
  };

  const openEdit = (b: CurrencyCode, q: CurrencyCode, r: number) => {
    setBase(b);
    setQuote(q);
    setRate(String(r));
    setDialog(true);
  };

  const save = async () => {
    const r = parseAmount(rate);
    if (r <= 0 || base === quote) return;
    await upsertRate(base, quote, r);
    bumpData();
    setDialog(false);
  };

  const remove = async (b: CurrencyCode, q: CurrencyCode) => {
    await deleteRate(b, q);
    bumpData();
  };

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: t('fx.title') }} />
      {!rates || rates.length === 0 ? (
        <EmptyState icon="swap-horizontal" text={t('fx.empty')} />
      ) : (
        <List.Section>
          {rates.map((r) => (
            <List.Item
              key={`${r.base}>${r.quote}`}
              title={`1 ${r.base} = ${formatNumber(r.rate, 4)} ${r.quote}`}
              description={t('fx.updated', { when: formatDate(r.updatedAt) })}
              onPress={() => openEdit(r.base, r.quote, r.rate)}
              right={() => <IconButton icon="delete" onPress={() => remove(r.base, r.quote)} />}
            />
          ))}
        </List.Section>
      )}

      <FAB icon="plus" style={{ position: 'absolute', right: 16, bottom: 16 }} onPress={openAdd} />

      <Portal>
        <Dialog visible={dialog} onDismiss={() => setDialog(false)}>
          <Dialog.Title>{t('fx.addRate')}</Dialog.Title>
          <Dialog.Content>
            <View style={{ gap: 12 }}>
              <SelectField label={t('transfer.from')} value={base} onChange={setBase} options={CURRENCY_OPTIONS} />
              <SelectField label={t('transfer.to')} value={quote} onChange={setQuote} options={CURRENCY_OPTIONS} />
              <AmountInput label={t('fx.oneUnit', { base })} value={rate} onChangeText={setRate} />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialog(false)}>{t('common.cancel')}</Button>
            <Button onPress={save}>{t('common.save')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}
