import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const FORMAT_VERSION = 'v2';

function getKey(): Buffer {
  const configuredKey = process.env.VAULT_ENCRYPTION_KEY;
  if (!configuredKey) {
    throw new Error(
      'VAULT_ENCRYPTION_KEY is required to use the password vault',
    );
  }
  return createHash('sha256').update(configuredKey).digest();
}

export function encryptVaultPassword(password: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(password, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    FORMAT_VERSION,
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

export function decryptVaultPassword(payload: string): string {
  const [version, ivValue, tagValue, encryptedValue] = payload.split(':');
  if (version !== FORMAT_VERSION || !ivValue || !tagValue || !encryptedValue) {
    throw new Error(
      'This password was saved with the previous client-encryption format. Re-enter and save it again.',
    );
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivValue, 'base64url'),
  );
  decipher.setAuthTag(
    Buffer.from(tagValue, 'base64url').subarray(0, TAG_LENGTH),
  );
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
