// src/utils/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64 (12 bytes)
  authTag: string; // base64 (16 bytes)
}

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

function assertKey(key: Buffer): void {
  if (key.length !== KEY_BYTES) {
    throw new Error(`Encryption key must be ${KEY_BYTES} bytes, got ${key.length}`);
  }
}

export function encrypt(plaintext: string, key: Buffer): EncryptedPayload {
  assertKey(key);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  if (authTag.length !== TAG_BYTES) {
    throw new Error(`Unexpected auth tag length: ${authTag.length}`);
  }

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

export function decrypt(payload: EncryptedPayload, key: Buffer): string {
  assertKey(key);
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.authTag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');

  if (iv.length !== IV_BYTES) {
    throw new Error(`Invalid IV length: ${iv.length}`);
  }
  if (tag.length !== TAG_BYTES) {
    throw new Error(`Invalid auth tag length: ${tag.length}`);
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/**
 * Returns a display-safe representation: first 4 chars + "..." + last 4 chars.
 * Never reveals enough to reconstruct the key.
 */
export function maskKey(plaintext: string): string {
  if (plaintext.length === 0) return '***...';
  if (plaintext.length <= 8) return `***...${plaintext}`;
  return `${plaintext.slice(0, 4)}...${plaintext.slice(-4)}`;
}

/**
 * Loads the master key from the environment and returns it as a 32-byte Buffer.
 * Throws if the key is missing or invalid.
 */
export function getMasterKey(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, 'base64');
  assertKey(key);
  return key;
}
