// tests/unit/encryption.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { randomBytes } from 'node:crypto';
import { encrypt, decrypt, maskKey, type EncryptedPayload } from '../../src/utils/encryption.js';

const MASTER_KEY = randomBytes(32);

describe('encryption (AES-256-GCM)', () => {
  describe('encrypt', () => {
    it('returns ciphertext, iv, and authTag as base64 strings', () => {
      const result = encrypt('secret-value', MASTER_KEY);
      expect(result.ciphertext).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(result.iv).toMatch(/^[A-Za-z0-9+/]+=*$/);
      expect(result.authTag).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('produces a 12-byte IV (16 chars base64)', () => {
      const { iv } = encrypt('x', MASTER_KEY);
      expect(Buffer.from(iv, 'base64')).toHaveLength(12);
    });

    it('produces a 16-byte auth tag (24 chars base64)', () => {
      const { authTag } = encrypt('x', MASTER_KEY);
      expect(Buffer.from(authTag, 'base64')).toHaveLength(16);
    });

    it('ciphertext has the same length as plaintext (GCM no padding)', () => {
      const plaintext = 'sk-abcdef1234567890';
      const { ciphertext } = encrypt(plaintext, MASTER_KEY);
      expect(Buffer.from(ciphertext, 'base64')).toHaveLength(plaintext.length);
    });

    it('generates a different IV for every call (never reuse)', () => {
      const a = encrypt('same', MASTER_KEY);
      const b = encrypt('same', MASTER_KEY);
      expect(a.iv).not.toBe(b.iv);
      expect(a.ciphertext).not.toBe(b.ciphertext);
    });

    it('throws when key is not 32 bytes', () => {
      expect(() => encrypt('x', Buffer.alloc(16))).toThrow(/key/i);
    });
  });

  describe('decrypt', () => {
    it('roundtrips ASCII', () => {
      const payload = encrypt('hello world', MASTER_KEY);
      expect(decrypt(payload, MASTER_KEY)).toBe('hello world');
    });

    it('roundtrips Unicode (Arabic)', () => {
      const payload = encrypt('مفتاح سري - 🔑', MASTER_KEY);
      expect(decrypt(payload, MASTER_KEY)).toBe('مفتاح سري - 🔑');
    });

    it('roundtrips empty string', () => {
      const payload = encrypt('', MASTER_KEY);
      expect(decrypt(payload, MASTER_KEY)).toBe('');
    });

    it('roundtrips a 10KB payload', () => {
      const big = 'a'.repeat(10_000);
      const payload = encrypt(big, MASTER_KEY);
      expect(decrypt(payload, MASTER_KEY)).toBe(big);
    });

    it('throws on tampered ciphertext', () => {
      const payload = encrypt('secret', MASTER_KEY);
      const bytes = Buffer.from(payload.ciphertext, 'base64');
      bytes[0] = bytes[0]! ^ 0xff; // flip a bit
      const tampered: EncryptedPayload = {
        ...payload,
        ciphertext: bytes.toString('base64'),
      };
      expect(() => decrypt(tampered, MASTER_KEY)).toThrow();
    });

    it('throws on tampered auth tag', () => {
      const payload = encrypt('secret', MASTER_KEY);
      const bytes = Buffer.from(payload.authTag, 'base64');
      bytes[0] = bytes[0]! ^ 0xff;
      const tampered: EncryptedPayload = {
        ...payload,
        authTag: bytes.toString('base64'),
      };
      expect(() => decrypt(tampered, MASTER_KEY)).toThrow();
    });

    it('throws with wrong key', () => {
      const payload = encrypt('secret', MASTER_KEY);
      expect(() => decrypt(payload, randomBytes(32))).toThrow();
    });
  });

  describe('maskKey', () => {
    it('returns prefix + last 4 chars', () => {
      expect(maskKey('sk-1234567890abcdef')).toBe('sk-1...cdef');
    });

    it('handles short keys gracefully', () => {
      expect(maskKey('abc')).toBe('***...abc');
    });

    it('handles empty string', () => {
      expect(maskKey('')).toBe('***...');
    });

    it('preserves the first 3 chars as provider hint', () => {
      expect(maskKey('gsk_abcdefghijklmnop')).toBe('gsk_...mnop');
    });
  });
});
