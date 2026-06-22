import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Button, List, Switch, TextInput } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { AmountInput } from '@/components/AmountInput';
import { SelectField, type SelectOption } from '@/components/SelectField';
import { DateField } from '@/components/DateField';
import { t } from '@/i18n';
import { CASH_CURRENCY_CODES, currencyMeta } from '@/money/currencies';
import { parseAmount } from '@/ui/number';
import { addMonths } from '@/ui/date';
import { listAccounts } from '@/db/repositories/accounts';
import { createGoal, deleteGoal, getGoal, updateGoal } from '@/db/repositories/goals';
import { useSettings } from '@/state/settings';
import { bumpData } from '@/state/dataVersion';
import type { Account } from '@/db/schema';

export default function GoalEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const displayCurrency = useSettings((s) => s.displayCurrency);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [currency, setCurrency] = useState(displayCurrency);
  const [hasDate, setHasDate] = useState(false);
  const [targetDate, setTargetDate] = useState(addMonths(Date.now(), 6));
  const [linkedId, setLinkedId] = useState<string>('');
  const [note, setNote] = useState('');

  useEffect(() => {
    listAccounts(false).then(setAccounts);
  }, []);

  useEffect(() => {
    if (!id) return;
    getGoal(id).then((g) => {
      if (!g) return;
      setName(g.name);
      setTarget(String(g.target_amount));
      setCurrency(g.currency);
      setHasDate(g.target_date != null);
      if (g.target_date != null) setTargetDate(g.target_date);
      setLinkedId(g.linked_account_id ?? '');
      setNote(g.note ?? '');
    });
  }, [id]);

  const accountOptions: SelectOption[] = [
    { key: '', label: t('common.none') },
    ...accounts.map((a) => ({ key: a.id, label: `${a.name} (${a.currency})` })),
  ];

  const save = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.required'), t('common.name'));
      return;
    }
    const amt = parseAmount(target);
    if (amt <= 0) {
      Alert.alert(t('common.required'), t('goals.target'));
      return;
    }
    const input = {
      name: name.trim(),
      target_amount: amt,
      currency,
      target_date: hasDate ? targetDate : null,
      linked_account_id: linkedId || null,
      note: note.trim() || null,
    };
    if (editing && id) await updateGoal(id, input);
    else await createGoal(input);
    bumpData();
    router.back();
  };

  const onDelete = () => {
    if (!id) return;
    deleteGoal(id).then(() => {
      bumpData();
      router.back();
    });
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: editing ? t('common.edit') : t('goals.addGoal'), presentation: 'modal' }} />
      <TextInput mode="outlined" label={t('common.name')} value={name} onChangeText={setName} autoFocus={!editing} />
      <AmountInput label={t('goals.target')} value={target} onChangeText={setTarget} currency={currency} />
      <SelectField
        label={t('common.currency')}
        value={currency}
        onChange={setCurrency}
        options={CASH_CURRENCY_CODES.map((c) => ({ key: c, label: `${c} — ${currencyMeta(c).symbol}` }))}
      />
      <SelectField label={t('goals.linkedAccount')} value={linkedId} onChange={setLinkedId} options={accountOptions} />
      <List.Item
        title={t('goals.targetDate')}
        right={() => <Switch value={hasDate} onValueChange={setHasDate} />}
        style={{ paddingHorizontal: 0 }}
      />
      {hasDate && <DateField label={t('goals.targetDate')} value={targetDate} onChange={setTargetDate} />}
      <TextInput mode="outlined" label={`${t('common.note')} (${t('common.optional')})`} value={note} onChangeText={setNote} multiline />

      <Button mode="contained" onPress={save} style={{ marginTop: 8 }}>
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
