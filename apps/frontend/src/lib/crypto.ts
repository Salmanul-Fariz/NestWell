/**
 * Web Crypto API AES-GCM client-side encryption and PBKDF2 key derivation.
 * The server only ever receives ciphertext (iv + data formatted in base64).
 */

const PBKDF2_ITERATIONS = 100000;
const SALT_STRING = 'nestwell_salt_v1_deterministic';

// Helper: Convert ArrayBuffer to Base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper: Convert Base64 string to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derive a CryptoKey from a master password using PBKDF2
 */
export async function deriveKey(masterPassword: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(SALT_STRING),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

const VAULT_KEY_STORAGE = 'nestwell_vault_key';

export async function persistCryptoKey(key: CryptoKey): Promise<void> {
  const jwk = await window.crypto.subtle.exportKey('jwk', key);
  sessionStorage.setItem(VAULT_KEY_STORAGE, JSON.stringify(jwk));
}

export async function restoreCryptoKey(): Promise<CryptoKey | null> {
  const raw = sessionStorage.getItem(VAULT_KEY_STORAGE);
  if (!raw) return null;
  try {
    return await window.crypto.subtle.importKey(
      'jwk',
      JSON.parse(raw),
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );
  } catch {
    sessionStorage.removeItem(VAULT_KEY_STORAGE);
    return null;
  }
}

export function clearPersistedCryptoKey() {
  sessionStorage.removeItem(VAULT_KEY_STORAGE);
}

/**
 * Encrypt plaintext using AES-GCM with a random 12-byte IV
 * Returns formatted string: `${iv_base64}:${ciphertext_base64}`
 */
export async function encryptPassword(plainText: string, key: CryptoKey): Promise<string> {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const cipherBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer as ArrayBuffer,
    },
    key,
    enc.encode(plainText),
  );

  const ivBase64 = arrayBufferToBase64(iv.buffer);
  const cipherBase64 = arrayBufferToBase64(cipherBuffer);

  return `${ivBase64}:${cipherBase64}`;
}

/**
 * Decrypt formatted ciphertext `${iv_base64}:${ciphertext_base64}` using AES-GCM
 */
export async function decryptPassword(encryptedPayload: string, key: CryptoKey): Promise<string> {
  const parts = encryptedPayload.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted payload format');
  }

  const [ivBase64, cipherBase64] = parts;
  const iv = base64ToUint8Array(ivBase64);
  const ciphertext = base64ToUint8Array(cipherBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer as ArrayBuffer,
    },
    key,
    ciphertext.buffer as ArrayBuffer,
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}

/**
 * Strong password generator with options
 */
export function generateStrongPassword(
  length: number = 20,
  options = { uppercase: true, lowercase: true, numbers: true, symbols: true },
): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const num = '0123456789';
  const sym = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let pool = '';
  if (options.uppercase) pool += upper;
  if (options.lowercase) pool += lower;
  if (options.numbers) pool += num;
  if (options.symbols) pool += sym;

  if (!pool) pool = lower + num;

  const array = new Uint32Array(length);
  window.crypto.getRandomValues(array);

  let result = '';
  for (let i = 0; i < length; i++) {
    result += pool[array[i] % pool.length];
  }
  return result;
}
