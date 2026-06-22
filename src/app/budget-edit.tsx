import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Button } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { AmountInput } from '@/components/AmountInput';
import { SelectField, type SelectOption } from '@/components/SelectField';
import { t } from '@/i18n';
import { CASH_CURRENCY_CODES, currencyMeta } from '@/money/currencies';
import { parseAmount } from '@/ui/number';
import { categoryLabel } from '@/ui/labels';
import { listCategories } from '@/db/repositories/categories';
import { createBudget, deleteBudget, getBudget, updateBudget } from '@/db/repositories/budgets';
import { useSettings } from '@/state/settings';
import { bumpData } from '@/state/dataVersion';
import type { Category } from '@/db/schema';

export default function BudgetEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;
  const displayCurrency = useSettings((s) => s.displayCurrency);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string>(''); // '' = overall
  const [limit, setLimit] = useState('');
  const [currency, setCurrency] = useState(displayCurrency);

  useEffect(() => {
    listCategories('expense').then(setCategories);
  }, []);

  useEffect(() => {
    if (!id) return;
    getBudget(id).then((b) => {
      if (!b) return;
      setCategoryId(b.category_id ?? '');
      setLimit(String(b.limit_amount));
      setCurrency(b.currency);
    });
  }, [id]);

  const options: SelectOption[] = [
    { key: '', label: t('budgets.overall') },
    ...categories.map((c) => ({ key: c.id, label: categoryLabel(c) })),
  ];

  const save = async () => {
    const amt = parseAmount(limit);
    if (amt <= 0) {
      Alert.alert(t('common.required'), t('budgets.limit'));
      return;
    }
    const input = { category_id: categoryId || null, limit_amount: amt, currency };
    if (editing && id) await updateBudget(id, input);
    else await createBudget(input);
    bumpData();
    router.back();
  };

  const onDelete = () => {
    if (!id) return;
    deleteBudget(id).then(() => {
      bumpData();
      router.back();
    });
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('budgets.addBudget'), presentation: 'modal' }} />
      <SelectField label={t('common.category')} value={categoryId} onChange={setCategoryId} options={options} />
      <AmountInput label={t('budgets.limit')} value={limit} onChangeText={setLimit} currency={currency} />
      <SelectField
        label={t('common.currency')}
        value={currency}
        onChange={setCurrency}
        options={CASH_CURRENCY_CODES.map((c) => ({ key: c, label: `${c} — ${currencyMeta(c).symbol}` }))}
      />
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
