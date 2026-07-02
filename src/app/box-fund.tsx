import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Button, HelperText } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { AmountInput } from '@/components/AmountInput';
import { SelectField, type SelectOption } from '@/components/SelectField';
import { DateField } from '@/components/DateField';
import { t } from '@/i18n';
import { parseAmount, sanitizeDecimal } from '@/ui/number';
import { formatNumber } from '@/money/format';
import { buildRateLookup, convert, type FxRate } from '@/money/fx';
import { listAccounts } from '@/db/repositories/accounts';
import { listRates } from '@/db/repositories/fxRates';
import { createTransfer } from '@/db/repositories/transfers';
import { getBox, type EventBoxView } from '@/db/repositories/boxes';
import { bumpData } from '@/state/dataVersion';
import type { Account } from '@/db/schema';

/**
 * Move money between a container and a "Just this time" box.
 * mode 'fund' (default): container → box — saving up / allocating money.
 * mode 'return': box → container — sending the leftover back after the event.
 */
export default function BoxFundScreen() {
  const params = useLocalSearchParams<{ id: string; mode?: string }>();
  const returning = params.mode === 'return';

  const [box, setBox] = useState<EventBoxView | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [rates, setRates] = useState<FxRate[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [boxAmount, setBoxAmount] = useState('');
  const [occurredAt, setOccurredAt] = useState(Date.now());

  useEffect(() => {
    if (!params.id) return;
    Promise.all([getBox(params.id), listAccounts(false), listRates()]).then(([b, accs, rs]) => {
      setBox(b);
      setAccounts(accs);
      setRates(rs);
      if (accs.length) setAccountId((prev) => prev ?? accs[0].id);
      // Returning: prefill with everything left in the box.
      if (b && params.mode === 'return' && b.balance > 0) {
        setAmount(String(b.balance));
        setBoxAmount(String(b.balance));
      }
    });
  }, [params.id, params.mode]);

  const account = accounts.find((a) => a.id === accountId) ?? null;
  const sameCurrency = box != null && account != null && account.currency === box.currency;

  const options: SelectOption[] = accounts.map((a) => ({
    key: a.id,
    label: `${a.name} (${a.currency})`,
  }));

  // The primary amount is entered in the box currency when returning
  // (box → container) and in the container currency when funding.
  const primaryCurrency = returning ? box?.currency : account?.currency;
  const secondaryCurrency = returning ? account?.currency : box?.currency;

  const recompute = (raw: string) => {
    setAmount(raw);
    if (!box || !account) return;
    if (sameCurrency) {
      setBoxAmount(raw);
      return;
    }
    const amt = parseAmount(raw);
    const lookup = buildRateLookup(rates);
    const from = returning ? box.currency : account.currency;
    const to = returning ? account.currency : box.currency;
    const r = convert(amt, from, to, lookup);
    if (r.value != null) setBoxAmount(formatNumber(r.value, 2).replace(/,/g, ''));
  };

  const save = async () => {
    if (!box || !accountId) return;
    const primary = parseAmount(amount);
    const secondary = sameCurrency ? primary : parseAmount(boxAmount);
    if (primary <= 0 || secondary <= 0) {
      Alert.alert(t('common.required'), t('common.amount'));
      return;
    }
    await createTransfer({
      from_account_id: returning ? box.account_id : accountId,
      to_account_id: returning ? accountId : box.account_id,
      from_amount: primary,
      to_amount: secondary,
      rate: secondary / primary,
      occurred_at: occurredAt,
      note: null,
    });
    bumpData();
    router.back();
  };

  const impliedRate = (() => {
    const f = parseAmount(amount);
    const s = parseAmount(boxAmount);
    if (sameCurrency || f <= 0 || s <= 0) return null;
    return s / f;
  })();

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: returning ? t('boxes.returnLeftover') : t('boxes.addMoney'),
          presentation: 'modal',
        }}
      />
      {!returning && (
        <HelperText type="info" visible>
          {t('boxes.addMoneyDesc')}
        </HelperText>
      )}
      <SelectField
        label={returning ? t('boxes.toContainer') : t('boxes.fromContainer')}
        value={accountId}
        onChange={(k) => {
          setAccountId(k);
        }}
        options={options}
      />
      <AmountInput
        label={`${t('common.amount')}${primaryCurrency ? ` (${primaryCurrency})` : ''}`}
        value={amount}
        onChangeText={recompute}
        currency={primaryCurrency}
        autoFocus={!returning}
      />
      {!sameCurrency && box && account && (
        <AmountInput
          label={
            returning
              ? `${t('common.amount')} (${secondaryCurrency})`
              : t('boxes.intoBox', { currency: box.currency })
          }
          value={boxAmount}
          onChangeText={(v) => setBoxAmount(sanitizeDecimal(v))}
          currency={secondaryCurrency}
        />
      )}
      {impliedRate != null && (
        <HelperText type="info" visible>
          {t('transfer.rate')}: 1 {primaryCurrency} = {formatNumber(impliedRate, 4)} {secondaryCurrency}
        </HelperText>
      )}
      <DateField label={t('common.date')} value={occurredAt} onChange={setOccurredAt} />

      <Button mode="contained" onPress={save} style={{ marginTop: 8 }} disabled={accounts.length === 0 || !box}>
        {t('common.save')}
      </Button>
      {accounts.length === 0 && (
        <HelperText type="error" visible>
          {t('accounts.noContainers')}
        </HelperText>
      )}
    </Screen>
  );
}
