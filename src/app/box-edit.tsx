import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Button, TextInput } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { AmountInput } from '@/components/AmountInput';
import { SelectField } from '@/components/SelectField';
import { DateField } from '@/components/DateField';
import { t } from '@/i18n';
import { CASH_CURRENCY_CODES, currencyMeta } from '@/money/currencies';
import { parseAmount } from '@/ui/number';
import { addMonths, endOfDay, startOfDay } from '@/ui/date';
import { createBox, deleteBox, getBox, listBoxes, nextBoxColor, updateBox } from '@/db/repositories/boxes';
import { useSettings } from '@/state/settings';
import { bumpData } from '@/state/dataVersion';

export default function BoxEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const displayCurrency = useSettings((s) => s.displayCurrency);

  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState(displayCurrency);
  const [startsAt, setStartsAt] = useState(addMonths(Date.now(), 1));
  const [endsAt, setEndsAt] = useState(addMonths(Date.now(), 1));
  const [note, setNote] = useState('');
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getBox(id).then((b) => {
      if (!b) return;
      setName(b.name);
      setBudget(String(b.budget_amount));
      setCurrency(b.currency);
      setStartsAt(b.starts_at);
      setEndsAt(b.ends_at);
      setNote(b.note ?? '');
      setColor(b.color);
    });
  }, [id]);

  const save = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.required'), t('common.name'));
      return;
    }
    const amt = parseAmount(budget);
    if (amt <= 0) {
      Alert.alert(t('common.required'), t('boxes.budget'));
      return;
    }
    if (startOfDay(endsAt) < startOfDay(startsAt)) {
      Alert.alert(t('boxes.title'), t('boxes.datesInvalid'));
      return;
    }
    const input = {
      name: name.trim(),
      budget_amount: amt,
      currency,
      starts_at: startOfDay(startsAt),
      ends_at: endOfDay(endsAt),
      note: note.trim() || null,
      color,
    };
    if (editing && id) {
      await updateBox(id, input);
    } else {
      const existing = await listBoxes();
      await createBox({ ...input, color: nextBoxColor(existing.length) });
    }
    bumpData();
    router.back();
  };

  const onDelete = () => {
    if (!id) return;
    Alert.alert(t('common.delete'), t('boxes.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteBox(id);
          bumpData();
          // Leave both the edit screen and the (now deleted) detail screen.
          router.dismissTo('/boxes');
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen
        options={{ title: editing ? t('boxes.editBox') : t('boxes.addBox'), presentation: 'modal' }}
      />
      <TextInput mode="outlined" label={t('common.name')} value={name} onChangeText={setName} autoFocus={!editing} />
      <AmountInput label={t('boxes.budget')} value={budget} onChangeText={setBudget} currency={currency} />
      <SelectField
        label={t('common.currency')}
        value={currency}
        onChange={setCurrency}
        options={CASH_CURRENCY_CODES.map((c) => ({ key: c, label: `${c} — ${currencyMeta(c).symbol}` }))}
      />
      <DateField
        label={t('boxes.starts')}
        value={startsAt}
        onChange={(ts) => {
          setStartsAt(ts);
          if (endsAt < ts) setEndsAt(ts);
        }}
      />
      <DateField label={t('boxes.ends')} value={endsAt} onChange={setEndsAt} />
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
