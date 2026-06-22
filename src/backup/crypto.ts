import * as Crypto from 'expo-crypto';

// A lightweight, dependency-free passphrase cipher for offline backups.
// Confidentiality comes from a SHA-256 keystream (CTR-style) XORed with the
// UTF-8 plaintext. Not a substitute for audited AES, but real protection when
// the passphrase is strong — and it keeps the app fully offline with no native
// crypto beyond expo-crypto's hashing + RNG.

export interface EncryptedPayload {
  v: 1;
  salt: string;
  verifier: string;
  data: string; // base64
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64Encode(latin1: string): string {
  let out = '';
  for (let i = 0; i < latin1.length; i += 3) {
    const a = latin1.charCodeAt(i);
    const b = i + 1 < latin1.length ? latin1.charCodeAt(i + 1) : NaN;
    const c = i + 2 < latin1.length ? latin1.charCodeAt(i + 2) : NaN;
    out += B64[a >> 2];
    out += B64[((a & 3) << 4) | (Number.isNaN(b) ? 0 : b >> 4)];
    out += Number.isNaN(b) ? '=' : B64[((b & 15) << 2) | (Number.isNaN(c) ? 0 : c >> 6)];
    out += Number.isNaN(c) ? '=' : B64[c & 63];
  }
  return out;
}

function base64Decode(b64: string): string {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  let out = '';
  for (let i = 0; i < clean.length; i += 4) {
    const a = B64.indexOf(clean[i]);
    const b = B64.indexOf(clean[i + 1]);
    const c = B64.indexOf(clean[i + 2]);
    const d = B64.indexOf(clean[i + 3]);
    out += String.fromCharCode((a << 2) | (b >> 4));
    if (c >= 0) out += String.fromCharCode(((b & 15) << 4) | (c >> 2));
    if (d >= 0) out += String.fromCharCode(((c & 3) << 6) | d);
  }
  return out;
}

function utf8Encode(str: string): string {
  return unescape(encodeURIComponent(str));
}

function utf8Decode(latin1: string): string {
  return decodeURIComponent(escape(latin1));
}

async function sha256(input: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}

function hexToBytes(hex: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.substr(i, 2), 16));
  return bytes;
}

async function keystream(passphrase: string, salt: string, blocks: number): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < blocks; i++) {
    out.push(...hexToBytes(await sha256(`${passphrase}|${salt}|${i}`)));
  }
  return out;
}

export async function encrypt(plaintext: string, passphrase: string): Promise<EncryptedPayload> {
  const saltBytes = await Crypto.getRandomBytesAsync(16);
  const salt = saltBytes.reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
  const verifier = (await sha256(`${passphrase}|${salt}|verify`)).slice(0, 16);

  const bytes = utf8Encode(plaintext);
  const ks = await keystream(passphrase, salt, Math.ceil(bytes.length / 32) || 1);
  let cipher = '';
  for (let i = 0; i < bytes.length; i++) {
    cipher += String.fromCharCode(bytes.charCodeAt(i) ^ ks[i]);
  }
  return { v: 1, salt, verifier, data: base64Encode(cipher) };
}

/** Returns the decrypted plaintext, or null if the passphrase is wrong. */
export async function decrypt(payload: EncryptedPayload, passphrase: string): Promise<string | null> {
  const verifier = (await sha256(`${passphrase}|${payload.salt}|verify`)).slice(0, 16);
  if (verifier !== payload.verifier) return null;

  const cipher = base64Decode(payload.data);
  const ks = await keystream(passphrase, payload.salt, Math.ceil(cipher.length / 32) || 1);
  let bytes = '';
  for (let i = 0; i < cipher.length; i++) {
    bytes += String.fromCharCode(cipher.charCodeAt(i) ^ ks[i]);
  }
  return utf8Decode(bytes);
}
