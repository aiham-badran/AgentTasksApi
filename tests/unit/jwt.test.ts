// tests/unit/jwt.test.ts
import { describe, it, expect } from 'vitest';
import { signToken, verifyToken, type JwtPayload } from '../../src/utils/jwt.js';
import { AuthInvalidError } from '../../src/utils/errors.js';

describe('jwt utils', () => {
  const payload: JwtPayload = {
    sub: 'user-123',
    email: 'user@example.com',
  };

  describe('signToken', () => {
    it('returns a valid JWT string (3 parts)', () => {
      const token = signToken(payload);
      expect(token.split('.')).toHaveLength(3);
    });

    it('returns different tokens for different payloads', () => {
      const t1 = signToken({ sub: 'a', email: 'a@a.com' });
      const t2 = signToken({ sub: 'b', email: 'b@b.com' });
      expect(t1).not.toBe(t2);
    });

    it('respects custom expiresIn option', () => {
      const token = signToken(payload, { expiresIn: '1h' });
      expect(token).toBeDefined();
    });
  });

  describe('verifyToken', () => {
    it('returns the payload for a valid token', () => {
      const token = signToken(payload);
      const decoded = verifyToken(token);
      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.email).toBe(payload.email);
    });

    it('throws AuthInvalidError on malformed token', () => {
      expect(() => verifyToken('not-a-jwt')).toThrow(AuthInvalidError);
    });

    it('throws AuthInvalidError on token signed with wrong secret', () => {
      // JWT مُوقّع بمفتاح مختلف
      const fakeToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ4IiwiZW1haWwiOiJ4QHguY29tIn0.wrong_signature_here';
      expect(() => verifyToken(fakeToken)).toThrow(AuthInvalidError);
    });

    it('throws AuthInvalidError on expired token', async () => {
      const token = signToken(payload, { expiresIn: '1ms' });
      await new Promise((r) => setTimeout(r, 50));
      expect(() => verifyToken(token)).toThrow(AuthInvalidError);
    });
  });
});
