import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Button, HelperText, SegmentedButtons, TextInput } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { AmountInput } from '@/components/AmountInput';
import { SelectField, type SelectOption } from '@/components/SelectField';
import { DateField } from '@/components/DateField';
import { t } from '@/i18n';
import { parseAmount } from '@/ui/number';
import { categoryLabel } from '@/ui/labels';
import { listAccounts } from '@/db/repositories/accounts';
import { listCategories } from '@/db/repositories/categories';
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  updateTransaction,
} from '@/db/repositories/transactions';
import { bumpData } from '@/state/dataVersion';
import type { Account, Category, TxKind } from '@/db/schema';

export default function TransactionEditScreen() {
  const params = useLocalSearchParams<{ id?: string; kind?: TxKind }>();
  const editing = !!params.id;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [kind, setKind] = useState<TxKind>(params.kind === 'income' ? 'income' : 'expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [occurredAt, setOccurredAt] = useState(Date.now());

  useEffect(() => {
    Promise.all([listAccounts(false), listCategories()]).then(([accs, cats]) => {
      setAccounts(accs);
      setCategories(cats);
      if (!params.id && accs.length) setAccountId((prev) => prev ?? accs[0].id);
    });
  }, [params.id]);

  useEffect(() => {
    if (!params.id) return;
    getTransaction(params.id).then((tx) => {
      if (!tx) return;
      setKind(tx.kind);
      setAmount(String(tx.amount));
      setAccountId(tx.account_id);
      setCategoryId(tx.category_id);
      setMerchant(tx.merchant ?? '');
      setNote(tx.note ?? '');
      setOccurredAt(tx.occurred_at);
    });
  }, [params.id]);

  const account = accounts.find((a) => a.id === accountId) ?? null;
  const currency = account?.currency ?? 'EGP';

  const accountOptions: SelectOption[] = accounts.map((a) => ({
    key: a.id,
    label: `${a.name} (${a.currency})`,
  }));

  const categoryOptions: SelectOption[] = useMemo(() => {
    const opts = categories
      .filter((c) => c.kind === kind)
      .map((c) => ({ key: c.id, label: categoryLabel(c) }));
    return [{ key: '', label: t('common.none') }, ...opts];
  }, [categories, kind]);

  // Reset category when switching kind if it no longer matches.
  useEffect(() => {
    if (categoryId && !categories.some((c) => c.id === categoryId && c.kind === kind)) {
      setCategoryId(null);
    }
  }, [kind, categoryId, categories]);

  const save = async () => {
    const amt = parseAmount(amount);
    if (!accountId) {
      Alert.alert(t('common.required'), t('tx.account'));
      return;
    }
    if (amt <= 0) {
      Alert.alert(t('common.required'), t('common.amount'));
      return;
    }
    const input = {
      account_id: accountId,
      kind,
      amount: amt,
      currency,
      category_id: categoryId,
      merchant: merchant.trim() || null,
      note: note.trim() || null,
      occurred_at: occurredAt,
    };
    if (editing && params.id) await updateTransaction(params.id, input);
    else await createTransaction(input);
    bumpData();
    router.back();
  };

  const onDelete = () => {
    if (!params.id) return;
    Alert.alert(t('common.delete'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteTransaction(params.id!);
          bumpData();
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: editing ? t('tx.editTransaction') : t('tx.newTransaction'),
          presentation: 'modal',
        }}
      />
      <SegmentedButtons
        value={kind}
        onValueChange={(v) => setKind(v as TxKind)}
        buttons={[
          { value: 'expense', label: t('tx.expense'), icon: 'arrow-up' },
          { value: 'income', label: t('tx.income'), icon: 'arrow-down' },
        ]}
      />
      <AmountInput value={amount} onChangeText={setAmount} currency={currency} autoFocus={!editing} />

      {accounts.length === 0 ? (
        <HelperText type="error" visible>
          {t('accounts.noContainers')}
        </HelperText>
      ) : (
        <SelectField
          label={t('tx.account')}
          value={accountId}
          onChange={setAccountId}
          options={accountOptions}
        />
      )}

      <SelectField
        label={t('common.category')}
        value={categoryId ?? ''}
        onChange={(k) => setCategoryId(k || null)}
        options={categoryOptions}
      />
      <TextInput mode="outlined" label={`${t('tx.merchant')} (${t('common.optional')})`} value={merchant} onChangeText={setMerchant} />
      <DateField label={t('common.date')} value={occurredAt} onChange={setOccurredAt} />
      <TextInput mode="outlined" label={`${t('common.note')} (${t('common.optional')})`} value={note} onChangeText={setNote} multiline />

      <Button mode="contained" onPress={save} style={{ marginTop: 8 }} disabled={accounts.length === 0}>
        {t('common.save')}
      </Button>
      {editing && (
        <Button mode="text" textColor="#C62828" onPress={onDelete}>
          {t('common.delete')}
        </Button>
      )}
    </Screen>
  );
}
