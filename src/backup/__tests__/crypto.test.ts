jest.mock('expo-crypto', () => {
  // require() inside the factory avoids jest's out-of-scope hoisting rule.
  const c = require('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digestStringAsync: async (_alg: string, data: string) =>
      c.createHash('sha256').update(data, 'utf8').digest('hex'),
    getRandomBytesAsync: async (n: number) => new Uint8Array(c.randomBytes(n)),
  };
});

import { encrypt, decrypt } from '../crypto';

describe('backup crypto', () => {
  it('round-trips ASCII and Arabic content', async () => {
    const plain = JSON.stringify({ a: 1, name: 'كارفور', amount: 1250.5, note: 'café ☕' });
    const enc = await encrypt(plain, 'hunter2');
    expect(enc.data).not.toContain('كارفور');
    const dec = await decrypt(enc, 'hunter2');
    expect(dec).toBe(plain);
  });

  it('returns null for the wrong passphrase', async () => {
    const enc = await encrypt('secret data', 'correct-horse');
    expect(await decrypt(enc, 'wrong-pass')).toBeNull();
  });

  it('handles empty content', async () => {
    const enc = await encrypt('', 'pw');
    expect(await decrypt(enc, 'pw')).toBe('');
  });
});
