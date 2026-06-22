import { useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Button, Dialog, Divider, HelperText, IconButton, List, Portal, Switch, Text, TextInput } from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { t } from '@/i18n';
import {
  createSender,
  deleteSender,
  deleteTemplate,
  listSenders,
  listTemplates,
  setSenderEnabled,
  setTemplateEnabled,
} from '@/db/repositories/sms';
import { useAsyncData, bumpData } from '@/state/dataVersion';

export default function SmsSendersScreen() {
  const { data: senders } = useAsyncData(listSenders);
  const { data: templates } = useAsyncData(listTemplates);
  const [dialog, setDialog] = useState(false);
  const [address, setAddress] = useState('');
  const [bank, setBank] = useState('');

  const add = async () => {
    if (!address.trim()) return;
    await createSender(address.trim(), bank.trim() || null);
    setAddress('');
    setBank('');
    setDialog(false);
    bumpData();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('sms.senders') }} />

      <HelperText type="info" visible>
        {t('sms.emptySenders')}
      </HelperText>

      <List.Section>
        <List.Subheader>{t('sms.senders')}</List.Subheader>
        {senders?.map((s) => (
          <List.Item
            key={s.id}
            title={s.address}
            description={s.bank_name ?? undefined}
            left={() => <List.Icon icon="bank" />}
            right={() => (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Switch value={s.enabled === 1} onValueChange={(v) => setSenderEnabled(s.id, v).then(bumpData)} />
                <IconButton icon="delete" onPress={() => deleteSender(s.id).then(bumpData)} />
              </View>
            )}
          />
        ))}
        <Button icon="plus" onPress={() => setDialog(true)} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
          {t('sms.addSender')}
        </Button>
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>{t('sms.templates')}</List.Subheader>
        {templates && templates.length > 0 ? (
          templates.map((tpl) => (
            <List.Item
              key={tpl.id}
              title={tpl.sender_match}
              description={`${tpl.learned ? '★ ' : ''}${tpl.field_map}`}
              left={() => <List.Icon icon="text-box-outline" />}
              right={() => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Switch value={tpl.enabled === 1} onValueChange={(v) => setTemplateEnabled(tpl.id, v).then(bumpData)} />
                  <IconButton icon="delete" onPress={() => deleteTemplate(tpl.id).then(bumpData)} />
                </View>
              )}
            />
          ))
        ) : (
          <Text style={{ paddingHorizontal: 16, opacity: 0.6 }}>{t('common.nothingYet')}</Text>
        )}
      </List.Section>

      <Portal>
        <Dialog visible={dialog} onDismiss={() => setDialog(false)}>
          <Dialog.Title>{t('sms.addSender')}</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <TextInput mode="outlined" label="Sender ID / name" value={address} onChangeText={setAddress} autoCapitalize="none" autoFocus />
            <TextInput mode="outlined" label={`Bank (${t('common.optional')})`} value={bank} onChangeText={setBank} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialog(false)}>{t('common.cancel')}</Button>
            <Button onPress={add}>{t('common.add')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}
