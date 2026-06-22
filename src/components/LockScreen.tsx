import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { authenticateBiometric, isBiometricAvailable, verifyPin } from '@/security/auth';
import { t } from '@/i18n';
import type { AppTheme } from '@/theme';

interface Props {
  onUnlock: () => void;
}

export function LockScreen({ onUnlock }: Props) {
  const theme = useTheme<AppTheme>();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);

  const tryBiometric = useCallback(async () => {
    const ok = await authenticateBiometric(t('lock.title'));
    if (ok) onUnlock();
  }, [onUnlock]);

  useEffect(() => {
    let active = true;
    (async () => {
      const avail = await isBiometricAvailable();
      if (!active) return;
      setBioAvailable(avail);
      if (avail) tryBiometric();
    })();
    return () => {
      active = false;
    };
  }, [tryBiometric]);

  const submitPin = async () => {
    if (await verifyPin(pin)) {
      onUnlock();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <MaterialCommunityIcons name="lock" size={64} color={theme.colors.primary} />
      <Text variant="headlineSmall" style={styles.title}>
        {t('lock.title')}
      </Text>
      <TextInput
        mode="outlined"
        label={t('lock.enterPin')}
        value={pin}
        onChangeText={(v) => {
          setPin(v.replace(/[^0-9]/g, ''));
          setError(false);
        }}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={8}
        style={styles.input}
        error={error}
        onSubmitEditing={submitPin}
      />
      {error && (
        <Text style={{ color: theme.colors.error }}>{t('lock.wrongPin')}</Text>
      )}
      <Button mode="contained" onPress={submitPin} style={styles.button} disabled={pin.length < 4}>
        {t('lock.unlock')}
      </Button>
      {bioAvailable && (
        <Button mode="text" icon="fingerprint" onPress={tryBiometric}>
          {t('lock.useBiometrics')}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { marginBottom: 12 },
  input: { width: '100%', maxWidth: 320 },
  button: { width: '100%', maxWidth: 320, marginTop: 8 },
});
