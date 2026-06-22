import * as Crypto from 'expo-crypto';

/** Generate a random UUID for use as a primary key. */
export function newId(): string {
  return Crypto.randomUUID();
}
