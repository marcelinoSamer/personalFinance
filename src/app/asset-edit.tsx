import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Button, SegmentedButtons, TextInput } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { AmountInput } from '@/components/AmountInput';
import { SelectField } from '@/components/SelectField';
import { DateField } from '@/components/DateField';
import { t } from '@/i18n';
import { CASH_CURRENCY_CODES, currencyMeta, DEFAULT_CURRENCY } from '@/money/currencies';
import { parseAmount, sanitizeDecimal } from '@/ui/number';
import { ASSET_TYPES } from '@/ui/meta';
import { assetTypeLabel } from '@/ui/labels';
import { createAsset, deleteAsset, getAsset, updateAsset } from '@/db/repositories/assets';
import { bumpData } from '@/state/dataVersion';
import type { AssetType } from '@/db/schema';

export default function AssetEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = !!id;

  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>('gold');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [valuedAt, setValuedAt] = useState(Date.now());
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!id) return;
    getAsset(id).then((a) => {
      
      if (!a) return;
      setName(a.name);
      setType(a.type);
      setQuantity(String(a.quantity));
      setUnit(a.unit ?? '');
      setValue(String(a.value));
      setCurrency(a.currency);
      setValuedAt(a.valued_at);
      setNote(a.note ?? '');
    });
  }, [id]);

  const save = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.required'), t('common.name'));
      return;
    }
    const input = {
      name: name.trim(),
      type,
      quantity: parseAmount(quantity) || 1,
      unit: unit.trim() || null,
      value: parseAmount(value),
      currency,
      valued_at: valuedAt,
      note: note.trim() || null,
    };
    if (editing && id) await updateAsset(id, input);
    else await createAsset(input);
    bumpData();
    router.back();
  };

  const onDelete = () => {
    if (!id) return;
    Alert.alert(t('common.delete'), name, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteAsset(id);
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
          title: editing ? t('asset.editAsset') : t('asset.newAsset'),
          presentation: 'modal',
        }}
      />
      <TextInput mode="outlined" label={t('common.name')} value={name} onChangeText={setName} autoFocus={!editing} />
      <SegmentedButtons
        value={type}
        onValueChange={(v) => setType(v as AssetType)}
        buttons={ASSET_TYPES.map((tp) => ({ value: tp, label: assetTypeLabel(tp) }))}
      />
      <TextInput
        mode="outlined"
        label={t('asset.quantity')}
        value={quantity}
        keyboardType="decimal-pad"
        onChangeText={(x) => setQuantity(sanitizeDecimal(x))}
      />
      <TextInput mode="outlined" label={`${t('asset.unit')} (${t('common.optional')})`} value={unit} onChangeText={setUnit} />
      <AmountInput label={t('asset.value')} value={value} onChangeText={setValue} currency={currency} />
      <SelectField
        label={t('common.currency')}
        value={currency}
        onChange={setCurrency}
        options={CASH_CURRENCY_CODES.map((c) => ({ key: c, label: `${c} — ${currencyMeta(c).symbol}` }))}
      />
      <DateField label={t('asset.valuedAt')} value={valuedAt} onChange={setValuedAt} />
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
