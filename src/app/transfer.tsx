import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { Button, HelperText, TextInput } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { AmountInput } from '@/components/AmountInput';
import { SelectField, type SelectOption } from '@/components/SelectField';
import { DateField } from '@/components/DateField';
import { t } from '@/i18n';
import { parseAmount, sanitizeDecimal } from '@/ui/number';
import { formatNumber } from '@/money/format';
import { buildRateLookup, convert } from '@/money/fx';
import { listAccounts } from '@/db/repositories/accounts';
import { listRates } from '@/db/repositories/fxRates';
import { createTransfer } from '@/db/repositories/transfers';
import { bumpData } from '@/state/dataVersion';
import type { Account } from '@/db/schema';
import type { FxRate } from '@/money/fx';

export default function TransferScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [rates, setRates] = useState<FxRate[]>([]);
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [fee, setFee] = useState('0');
  const [occurredAt, setOccurredAt] = useState(Date.now());
  const [note, setNote] = useState('');

  useEffect(() => {
    Promise.all([listAccounts(false), listRates()]).then(([accs, rs]) => {
      setAccounts(accs);
      setRates(rs);
      if (accs.length) setFromId((p) => p ?? accs[0].id);
      if (accs.length > 1) setToId((p) => p ?? accs[1].id);
    });
  }, []);

  const from = accounts.find((a) => a.id === fromId) ?? null;
  const to = accounts.find((a) => a.id === toId) ?? null;
  const sameCurrency = from && to && from.currency === to.currency;

  const options: SelectOption[] = accounts.map((a) => ({
    key: a.id,
    label: `${a.name} (${a.currency})`,
  }));

  // Auto-fill the received amount from the FX table (or 1:1 for same currency).
  const recompute = (rawFrom: string) => {
    setFromAmount(rawFrom);
    if (!from || !to) return;
    const amt = parseAmount(rawFrom);
    if (from.currency === to.currency) {
      setToAmount(rawFrom);
      return;
    }
    const lookup = buildRateLookup(rates);
    const r = convert(amt, from.currency, to.currency, lookup);
    if (r.value != null) setToAmount(String(formatNumber(r.value, 2).replace(/,/g, '')));
  };

  const impliedRate = (() => {
    const f = parseAmount(fromAmount);
    const tt = parseAmount(toAmount);
    if (f <= 0 || tt <= 0) return null;
    return tt / f;
  })();

  const save = async () => {
    if (!fromId || !toId) {
      Alert.alert(t('common.required'), t('transfer.from'));
      return;
    }
    if (fromId === toId) {
      Alert.alert(t('transfer.title'), `${t('transfer.from')} ≠ ${t('transfer.to')}`);
      return;
    }
    const f = parseAmount(fromAmount);
    const tt = sameCurrency ? f : parseAmount(toAmount);
    if (f <= 0 || tt <= 0) {
      Alert.alert(t('common.required'), t('common.amount'));
      return;
    }
    await createTransfer({
      from_account_id: fromId,
      to_account_id: toId,
      from_amount: f,
      to_amount: tt,
      rate: tt / f,
      fee: parseAmount(fee),
      fee_currency: from?.currency ?? null,
      occurred_at: occurredAt,
      note: note.trim() || null,
    });
    bumpData();
    router.back();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('transfer.title'), presentation: 'modal' }} />

      <SelectField label={t('transfer.from')} value={fromId} onChange={(k) => { setFromId(k); recompute(fromAmount); }} options={options} />
      <SelectField label={t('transfer.to')} value={toId} onChange={(k) => { setToId(k); recompute(fromAmount); }} options={options} />

      <AmountInput label={t('transfer.fromAmount')} value={fromAmount} onChangeText={recompute} currency={from?.currency} />
      {!sameCurrency && (
        <AmountInput label={t('transfer.toAmount')} value={toAmount} onChangeText={(v) => setToAmount(sanitizeDecimal(v))} currency={to?.currency} />
      )}
      {impliedRate != null && !sameCurrency && (
        <HelperText type="info" visible>
          {t('transfer.rate')}: 1 {from?.currency} = {formatNumber(impliedRate, 4)} {to?.currency}
        </HelperText>
      )}

      <AmountInput label={`${t('transfer.fee')} (${from?.currency ?? ''})`} value={fee} onChangeText={setFee} currency={from?.currency} />
      <DateField label={t('common.date')} value={occurredAt} onChange={setOccurredAt} />
      <TextInput mode="outlined" label={`${t('common.note')} (${t('common.optional')})`} value={note} onChangeText={setNote} multiline />

      <Button mode="contained" onPress={save} style={{ marginTop: 8 }} disabled={accounts.length < 2}>
        {t('common.save')}
      </Button>
      {accounts.length < 2 && (
        <HelperText type="error" visible>
          {t('accounts.noContainers')}
        </HelperText>
      )}
    </Screen>
  );
}
