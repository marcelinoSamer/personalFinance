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
import { listBoxes } from '@/db/repositories/boxes';
import { boxPhase } from '@/money/boxes';
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  updateTransaction,
} from '@/db/repositories/transactions';
import { bumpData } from '@/state/dataVersion';
import type { Account, Category, TxKind } from '@/db/schema';

export default function TransactionEditScreen() {
  const params = useLocalSearchParams<{ id?: string; kind?: TxKind; boxId?: string }>();
  const editing = !!params.id;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  // account_id -> box account (an account whose type is 'box'), reachable in the
  // container picker for expenses.
  const [boxAccountIds, setBoxAccountIds] = useState<Set<string>>(new Set());

  const [kind, setKind] = useState<TxKind>(params.kind === 'income' ? 'income' : 'expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [occurredAt, setOccurredAt] = useState(Date.now());

  useEffect(() => {
    // Load every account (incl. archived + box accounts) so any existing tx
    // resolves its currency; the picker itself narrows what is offered (below).
    Promise.all([listAccounts(true, true), listCategories(), listBoxes()]).then(
      ([accs, cats, boxes]) => {
        const boxByAccount = new Map(boxes.map((b) => [b.account_id, b] as const));
        // Boxes you can spend from: active or upcoming events.
        const spendable = new Set(
          boxes
            .filter((b) => boxPhase(b) === 'active' || boxPhase(b) === 'upcoming')
            .map((b) => b.account_id),
        );
        setBoxAccountIds(spendable);
        setAccounts(accs);
        setCategories(cats);
        if (!params.id) {
          if (params.boxId) {
            const box = boxes.find((b) => b.id === params.boxId);
            if (box) {
              setAccountId((prev) => prev ?? box.account_id);
              return;
            }
          }
          const firstNormal = accs.find((a) => !boxByAccount.has(a.id) && a.archived === 0);
          if (firstNormal) setAccountId((prev) => prev ?? firstNormal.id);
        }
      },
    );
  }, [params.id, params.boxId]);

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
  const usingBox = account != null && account.type === 'box';

  // Container options: normal containers, then spendable boxes (expenses only).
  // A box already attached to this tx stays listed even once its event ends.
  const accountOptions: SelectOption[] = useMemo(() => {
    const normal = accounts.filter(
      (a) => a.type !== 'box' && (a.archived === 0 || a.id === accountId),
    );
    const opts: SelectOption[] = normal.map((a) => ({ key: a.id, label: `${a.name} (${a.currency})` }));
    if (kind === 'expense') {
      const boxes = accounts.filter(
        (a) => a.type === 'box' && (boxAccountIds.has(a.id) || a.id === accountId),
      );
      for (const b of boxes) {
        opts.push({
          key: b.id,
          label: `🎉 ${b.name} (${b.currency})`,
          description: t('boxes.justThisTime'),
        });
      }
    }
    return opts;
  }, [accounts, boxAccountIds, kind, accountId]);

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

  // Income can't go into a box (funding uses transfers); fall back to a container.
  useEffect(() => {
    if (kind === 'income' && usingBox) {
      const firstNormal = accounts.find((a) => a.type !== 'box' && a.archived === 0);
      setAccountId(firstNormal?.id ?? null);
    }
  }, [kind, usingBox, accounts]);

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
      {usingBox && (
        <HelperText type="info" visible>
          {t('boxes.justThisTime')}
        </HelperText>
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
