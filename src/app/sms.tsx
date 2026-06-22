import { useEffect, useState } from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import {
  Button,
  Card,
  Chip,
  IconButton,
  SegmentedButtons,
  Snackbar,
  Text,
  useTheme,
} from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';
import { AmountInput } from '@/components/AmountInput';
import { SelectField, type SelectOption } from '@/components/SelectField';
import { t } from '@/i18n';
import { parseAmount } from '@/ui/number';
import { categoryLabel } from '@/ui/labels';
import { formatDate } from '@/ui/date';
import { smsSupported, scanAndEnqueue } from '@/sms/scanner';
import type { Direction, ParsedSms } from '@/sms/types';
import { listAccounts } from '@/db/repositories/accounts';
import { listCategories } from '@/db/repositories/categories';
import { createTransaction } from '@/db/repositories/transactions';
import { createTemplate, listPending, setPendingStatus } from '@/db/repositories/sms';
import { useAsyncData, bumpData } from '@/state/dataVersion';
import type { Account, Category, SmsPending } from '@/db/schema';

interface Draft {
  accountId: string | null;
  categoryId: string | null;
  amount: string;
  direction: Direction;
}

export default function SmsScreen() {
  const theme = useTheme();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [snack, setSnack] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const { data: pending } = useAsyncData(() => listPending('pending'));

  useEffect(() => {
    Promise.all([listAccounts(false), listCategories()]).then(([a, c]) => {
      setAccounts(a);
      setCategories(c);
    });
  }, []);

  // Seed a draft for each pending item from its parsed guess.
  useEffect(() => {
    if (!pending) return;
    setDrafts((prev) => {
      const next = { ...prev };
      for (const p of pending) {
        if (next[p.id]) continue;
        const guess = safeParse(p.parsed_guess);
        next[p.id] = {
          accountId: accounts[0]?.id ?? null,
          categoryId: null,
          amount: guess.amount != null ? String(guess.amount) : '',
          direction: guess.direction ?? 'out',
        };
      }
      return next;
    });
  }, [pending, accounts]);

  const accountOptions: SelectOption[] = accounts.map((a) => ({
    key: a.id,
    label: `${a.name} (${a.currency})`,
  }));

  const update = (id: string, patch: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  const scan = async () => {
    if (!smsSupported()) {
      Alert.alert(t('sms.title'), t('sms.onlyAndroid'));
      return;
    }
    setScanning(true);
    try {
      const res = await scanAndEnqueue();
      if (res.noSenders) setSnack(t('sms.emptySenders'));
      else setSnack(res.enqueued > 0 ? t('sms.detected', { count: res.enqueued }) : t('sms.nothingNew'));
      bumpData();
    } catch (e) {
      setSnack(e instanceof Error && e.message === 'permission-denied' ? t('sms.permissionNeeded') : String(e));
    } finally {
      setScanning(false);
    }
  };

  const confirm = async (p: SmsPending) => {
    const d = drafts[p.id];
    if (!d?.accountId) {
      Alert.alert(t('common.required'), t('tx.account'));
      return;
    }
    const amt = parseAmount(d.amount);
    if (amt <= 0) {
      Alert.alert(t('common.required'), t('common.amount'));
      return;
    }
    const account = accounts.find((a) => a.id === d.accountId)!;
    const guess = safeParse(p.parsed_guess);
    await createTransaction({
      account_id: d.accountId,
      kind: d.direction === 'in' ? 'income' : 'expense',
      amount: amt,
      currency: account.currency,
      category_id: d.categoryId,
      merchant: guess.merchant,
      note: p.raw_body,
      occurred_at: guess.occurredAt ?? p.received_at,
      source: 'sms',
      sms_ref: p.dedup_hash,
    });
    await setPendingStatus(p.id, 'confirmed');
    bumpData();
  };

  const dismiss = async (p: SmsPending) => {
    await setPendingStatus(p.id, 'dismissed');
    bumpData();
  };

  const saveTemplate = async (p: SmsPending) => {
    const d = drafts[p.id];
    const guess = safeParse(p.parsed_guess);
    await createTemplate({
      sender_match: p.sender,
      lang: 'auto',
      pattern: '',
      field_map: JSON.stringify({ direction: d.direction, currency: guess.currency ?? undefined }),
      learned: true,
    });
    setSnack(t('sms.saveTemplate'));
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: t('sms.review'),
          headerRight: () => <IconButton icon="cog" onPress={() => router.push('/sms-senders')} />,
        }}
      />

      <Button mode="contained" icon="message-text-fast" loading={scanning} onPress={scan}>
        {t('sms.scanNow')}
      </Button>
      {!smsSupported() && (
        <Text style={{ color: theme.colors.onSurfaceVariant }}>{t('sms.onlyAndroid')}</Text>
      )}

      {pending && pending.length === 0 && <EmptyState icon="inbox-outline" text={t('sms.emptyQueue')} />}

      {pending?.map((p) => {
        const d = drafts[p.id];
        if (!d) return null;
        const cats = categories.filter((c) => c.kind === (d.direction === 'in' ? 'income' : 'expense'));
        const catOptions: SelectOption[] = [
          { key: '', label: t('common.none') },
          ...cats.map((c) => ({ key: c.id, label: categoryLabel(c) })),
        ];
        return (
          <Card key={p.id} mode="contained">
            <Card.Content style={{ gap: 8 }}>
              <View style={styles.row}>
                <Text variant="labelLarge">{p.sender}</Text>
                <Chip compact>{Math.round(p.confidence * 100)}%</Chip>
              </View>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {formatDate(p.received_at)}
              </Text>
              <Text variant="bodySmall" numberOfLines={3}>
                {p.raw_body}
              </Text>

              <SegmentedButtons
                value={d.direction}
                onValueChange={(v) => update(p.id, { direction: v as Direction })}
                buttons={[
                  { value: 'out', label: t('tx.expense') },
                  { value: 'in', label: t('tx.income') },
                ]}
              />
              <AmountInput value={d.amount} onChangeText={(v) => update(p.id, { amount: v })} currency={accounts.find((a) => a.id === d.accountId)?.currency} />
              <SelectField label={t('tx.account')} value={d.accountId} onChange={(k) => update(p.id, { accountId: k })} options={accountOptions} />
              <SelectField label={t('common.category')} value={d.categoryId ?? ''} onChange={(k) => update(p.id, { categoryId: k || null })} options={catOptions} />

              <View style={styles.actions}>
                <Button mode="text" onPress={() => dismiss(p)}>{t('common.dismiss')}</Button>
                <Button mode="text" onPress={() => saveTemplate(p)}>{t('sms.saveTemplate')}</Button>
                <Button mode="contained" onPress={() => confirm(p)}>{t('common.confirm')}</Button>
              </View>
            </Card.Content>
          </Card>
        );
      })}

      <Snackbar visible={!!snack} onDismiss={() => setSnack(null)} duration={3000}>
        {snack ?? ''}
      </Snackbar>
    </Screen>
  );
}

function safeParse(json: string): ParsedSms {
  try {
    return JSON.parse(json) as ParsedSms;
  } catch {
    return { direction: null, amount: null, currency: null, merchant: null, balance: null, occurredAt: null, confidence: 0, language: 'en' };
  }
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
});
