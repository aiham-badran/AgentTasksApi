// tests/unit/password.test.ts
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/utils/password.js';

describe('password utils', () => {
  describe('hashPassword', () => {
    it('returns a hash different from the input', async () => {
      const hash = await hashPassword('Password123');
      expect(hash).not.toBe('Password123');
    });

    it('produces a bcrypt hash with cost 12', async () => {
      const hash = await hashPassword('Password123');
      // bcrypt format: $2b$12$...
      expect(hash).toMatch(/^\$2[aby]\$12\$/);
    });

    it('produces different hashes for the same password (salt)', async () => {
      const h1 = await hashPassword('Password123');
      const h2 = await hashPassword('Password123');
      expect(h1).not.toBe(h2);
    });

    it('throws on empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow();
    });
  });

  describe('verifyPassword', () => {
    it('returns true for correct password', async () => {
      const hash = await hashPassword('Password123');
      await expect(verifyPassword('Password123', hash)).resolves.toBe(true);
    });

    it('returns false for wrong password', async () => {
      const hash = await hashPassword('Password123');
      await expect(verifyPassword('WrongPassword', hash)).resolves.toBe(false);
    });

    it('returns false for empty password', async () => {
      const hash = await hashPassword('Password123');
      await expect(verifyPassword('', hash)).resolves.toBe(false);
    });
  });
});
