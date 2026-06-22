import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const PIN_HASH_KEY = 'lock.pin.hash';
const PIN_SALT_KEY = 'lock.pin.salt';

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

export async function hasPin(): Promise<boolean> {
  return (await SecureStore.getItemAsync(PIN_HASH_KEY)) != null;
}

export async function setPin(pin: string): Promise<void> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  let salt = '';
  for (let i = 0; i < bytes.length; i++) salt += bytes[i].toString(16).padStart(2, '0');
  const hash = await hashPin(pin, salt);
  await SecureStore.setItemAsync(PIN_SALT_KEY, salt);
  await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const salt = await SecureStore.getItemAsync(PIN_SALT_KEY);
  const stored = await SecureStore.getItemAsync(PIN_HASH_KEY);
  if (!salt || !stored) return false;
  const hash = await hashPin(pin, salt);
  return hash === stored;
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_HASH_KEY);
  await SecureStore.deleteItemAsync(PIN_SALT_KEY);
}

export async function isBiometricAvailable(): Promise<boolean> {
  const [hw, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hw && enrolled;
}

export async function authenticateBiometric(promptMessage: string): Promise<boolean> {
  const res = await LocalAuthentication.authenticateAsync({
    promptMessage,
    disableDeviceFallback: false,
  });
  return res.success;
}
