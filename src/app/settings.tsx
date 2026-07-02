import { useState } from 'react';
import { Alert, View } from 'react-native';
import { reloadAppAsync } from 'expo';
import { Stack, router } from 'expo-router';
import {
  Button,
  Dialog,
  Divider,
  List,
  Portal,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { Screen } from '@/components/Screen';
import { SelectField } from '@/components/SelectField';
import { t, type AppLocale } from '@/i18n';
import { CASH_CURRENCY_CODES, currencyMeta } from '@/money/currencies';
import { useSettings, type ThemeMode } from '@/state/settings';
import { clearPin, setPin } from '@/security/auth';
import { exportData, importData } from '@/backup';

export default function SettingsScreen() {
  const theme = useTheme();
  const s = useSettings();
  const [pinDialog, setPinDialog] = useState(false);
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const [backupMode, setBackupMode] = useState<'export' | 'import' | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);

  const onChangeLocale = async (locale: AppLocale) => {
    const changed = await s.setLocale(locale);
    if (changed) {
      Alert.alert(t('settings.language'), t('settings.offlineNote'));
      try {
        await reloadAppAsync();
      } catch {
        // Reload not available; the new direction applies on next launch.
      }
    }
  };

  const onToggleLock = async (value: boolean) => {
    if (value) {
      setPin1('');
      setPin2('');
      setPinError(null);
      setPinDialog(true);
    } else {
      await clearPin();
      await s.setLockEnabled(false);
    }
  };

  const confirmPin = async () => {
    if (pin1.length < 4) {
      setPinError(t('lock.setPin'));
      return;
    }
    if (pin1 !== pin2) {
      setPinError(t('lock.pinMismatch'));
      return;
    }
    await setPin(pin1);
    await s.setLockEnabled(true);
    setPinDialog(false);
  };

  const runBackup = async () => {
    if (passphrase.length < 4) {
      Alert.alert(t('settings.backup'), t('common.required'));
      return;
    }
    setBusy(true);
    try {
      if (backupMode === 'export') {
        await exportData(passphrase);
        setBackupMode(null);
      } else {
        const res = await importData(passphrase);
        if (res.ok) {
          setBackupMode(null);
          Alert.alert(t('settings.backup'), t('common.done'));
        } else if (res.reason === 'wrong-pass') {
          Alert.alert(t('settings.backup'), t('lock.wrongPin'));
        } else if (res.reason !== 'cancelled') {
          Alert.alert(t('settings.backup'), t('common.required'));
        } else {
          setBackupMode(null);
        }
      }
    } catch (e) {
      Alert.alert(t('settings.backup'), e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setPassphrase('');
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('more.accountSettings') }} />

      <List.Subheader>{t('settings.general')}</List.Subheader>
      <SelectField
        label={t('settings.displayCurrency')}
        value={s.displayCurrency}
        onChange={s.setDisplayCurrency}
        options={CASH_CURRENCY_CODES.map((c) => ({ key: c, label: `${c} — ${currencyMeta(c).nameEn}` }))}
      />
      <View style={{ gap: 6 }}>
        <Text variant="labelLarge">{t('settings.language')}</Text>
        <SegmentedButtons
          value={s.locale}
          onValueChange={(v) => onChangeLocale(v as AppLocale)}
          buttons={[
            { value: 'en', label: 'English' },
            { value: 'ar', label: 'العربية' },
          ]}
        />
      </View>
      <View style={{ gap: 6 }}>
        <Text variant="labelLarge">{t('settings.theme')}</Text>
        <SegmentedButtons
          value={s.themeMode}
          onValueChange={(v) => s.setThemeMode(v as ThemeMode)}
          buttons={[
            { value: 'system', label: t('settings.themeSystem') },
            { value: 'light', label: t('settings.themeLight') },
            { value: 'dark', label: t('settings.themeDark') },
          ]}
        />
      </View>

      <Divider />
      <List.Subheader>{t('settings.security')}</List.Subheader>
      <List.Item
        title={t('settings.appLock')}
        description={t('settings.appLockDesc')}
        right={() => <Switch value={s.lockEnabled} onValueChange={onToggleLock} />}
      />

      <Divider />
      <List.Subheader>{t('settings.data')}</List.Subheader>
      <List.Item title={t('fx.title')} left={() => <List.Icon icon="swap-horizontal" />} onPress={() => router.push('/fx-rates')} />
      <List.Item
        title={t('settings.exportData')}
        left={() => <List.Icon icon="export" />}
        onPress={() => { setPassphrase(''); setBackupMode('export'); }}
      />
      <List.Item
        title={t('settings.importData')}
        left={() => <List.Icon icon="import" />}
        onPress={() => { setPassphrase(''); setBackupMode('import'); }}
      />

      <Divider />
      <List.Item
        title={t('settings.about')}
        description={t('settings.offlineNote')}
        left={() => <List.Icon icon="shield-lock-outline" color={theme.colors.primary} />}
      />

      <Portal>
        <Dialog visible={pinDialog} onDismiss={() => setPinDialog(false)}>
          <Dialog.Title>{t('lock.setPin')}</Dialog.Title>
          <Dialog.Content style={{ gap: 12 }}>
            <TextInput
              mode="outlined"
              label={t('lock.setPin')}
              value={pin1}
              onChangeText={(v) => setPin1(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
            />
            <TextInput
              mode="outlined"
              label={t('lock.confirmPin')}
              value={pin2}
              onChangeText={(v) => setPin2(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
            />
            {pinError && <Text style={{ color: theme.colors.error }}>{pinError}</Text>}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPinDialog(false)}>{t('common.cancel')}</Button>
            <Button onPress={confirmPin}>{t('common.save')}</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={backupMode !== null} onDismiss={() => setBackupMode(null)}>
          <Dialog.Title>
            {backupMode === 'export' ? t('settings.exportData') : t('settings.importData')}
          </Dialog.Title>
          <Dialog.Content style={{ gap: 8 }}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {t('settings.offlineNote')}
            </Text>
            <TextInput
              mode="outlined"
              label="Passphrase"
              value={passphrase}
              onChangeText={setPassphrase}
              secureTextEntry
              autoCapitalize="none"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setBackupMode(null)}>{t('common.cancel')}</Button>
            <Button loading={busy} onPress={runBackup}>
              {backupMode === 'export' ? t('settings.exportData') : t('settings.importData')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}
