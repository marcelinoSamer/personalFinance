import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Button, Dialog, Portal, RadioButton, TextInput } from 'react-native-paper';

import { t } from '@/i18n';

export interface SelectOption {
  key: string;
  label: string;
  description?: string;
}

interface Props {
  label: string;
  value: string | null;
  options: SelectOption[];
  onChange: (key: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/** A read-only TextInput that opens a dialog with a single-choice list. */
export function SelectField({ label, value, options, onChange, placeholder, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.key === value);

  return (
    <>
      <TextInput
        mode="outlined"
        label={label}
        value={selected?.label ?? ''}
        placeholder={placeholder}
        editable={false}
        right={<TextInput.Icon icon="chevron-down" onPress={() => !disabled && setOpen(true)} />}
        onPressIn={() => !disabled && setOpen(true)}
        showSoftInputOnFocus={false}
      />
      <Portal>
        <Dialog visible={open} onDismiss={() => setOpen(false)}>
          <Dialog.Title>{label}</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView style={{ maxHeight: 360 }}>
              <RadioButton.Group
                value={value ?? ''}
                onValueChange={(v) => {
                  onChange(v);
                  setOpen(false);
                }}
              >
                {options.map((o) => (
                  <RadioButton.Item key={o.key} value={o.key} label={o.label} />
                ))}
              </RadioButton.Group>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setOpen(false)}>{t('common.close')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}
