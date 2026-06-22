import { useState } from 'react';
import { View } from 'react-native';
import { Button, Chip, Dialog, Portal, TextInput } from 'react-native-paper';

import { t } from '@/i18n';
import { formatDate } from '@/ui/date';

interface Props {
  label: string;
  value: number;
  onChange: (ts: number) => void;
}

function toYMD(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function parseYMD(s: string): number | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s.trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), 12, 0, 0, 0);
  if (date.getMonth() !== Number(mo) - 1) return null; // invalid day rollover
  return date.getTime();
}

export function DateField({ label, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(toYMD(value));
  const [error, setError] = useState(false);

  const openDialog = () => {
    setText(toYMD(value));
    setError(false);
    setOpen(true);
  };

  const confirm = () => {
    const ts = parseYMD(text);
    if (ts == null) {
      setError(true);
      return;
    }
    onChange(ts);
    setOpen(false);
  };

  const quick = (ts: number) => {
    setText(toYMD(ts));
    setError(false);
  };

  return (
    <>
      <TextInput
        mode="outlined"
        label={label}
        value={formatDate(value)}
        editable={false}
        right={<TextInput.Icon icon="calendar" onPress={openDialog} />}
        onPressIn={openDialog}
        showSoftInputOnFocus={false}
      />
      <Portal>
        <Dialog visible={open} onDismiss={() => setOpen(false)}>
          <Dialog.Title>{label}</Dialog.Title>
          <Dialog.Content>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <Chip onPress={() => quick(Date.now())}>{t('common.today')}</Chip>
              <Chip onPress={() => quick(Date.now() - 86400000)}>{t('common.yesterday')}</Chip>
            </View>
            <TextInput
              mode="outlined"
              label="YYYY-MM-DD"
              value={text}
              onChangeText={(v) => {
                setText(v);
                setError(false);
              }}
              keyboardType="numbers-and-punctuation"
              error={error}
              autoCapitalize="none"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button onPress={confirm}>{t('common.done')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}
