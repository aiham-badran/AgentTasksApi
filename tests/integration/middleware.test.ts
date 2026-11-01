// tests/integration/middleware.test.ts
import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../src/middleware/auth.middleware.js';
import { signToken } from '../../src/utils/jwt.js';
import { AuthRequiredError, AuthInvalidError } from '../../src/utils/errors.js';

function makeReq(authorization?: string): Request {
  return {
    headers: authorization ? { authorization } : {},
  } as unknown as Request;
}

function makeRes(): Response {
  return {} as Response;
}

describe('requireAuth middleware', () => {
  it('attaches req.user and calls next() with no args on valid token', () => {
    const token = signToken({ sub: 'user-1', email: 'a@b.com' });
    const req = makeReq(`Bearer ${token}`);
    const next = vi.fn();

    requireAuth(req, makeRes(), next as NextFunction);

    expect(next).toHaveBeenCalledWith(); // بدون error
    expect(req.user).toEqual({ id: 'user-1', email: 'a@b.com' });
  });

  it('passes AuthRequiredError when Authorization header missing', () => {
    const req = makeReq();
    const next = vi.fn();

    requireAuth(req, makeRes(), next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.any(AuthRequiredError));
  });

  it('passes AuthInvalidError when header is not "Bearer <token>"', () => {
    const req = makeReq('Token abc123');
    const next = vi.fn();

    requireAuth(req, makeRes(), next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.any(AuthInvalidError));
  });

  it('passes AuthInvalidError on invalid token', () => {
    const req = makeReq('Bearer not-a-jwt');
    const next = vi.fn();

    requireAuth(req, makeRes(), next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.any(AuthInvalidError));
  });

  it('passes AuthInvalidError on expired token', async () => {
    const expired = signToken({ sub: 'u', email: 'e@e.com' }, { expiresIn: '1ms' });
    await new Promise((r) => setTimeout(r, 50));

    const req = makeReq(`Bearer ${expired}`);
    const next = vi.fn();

    requireAuth(req, makeRes(), next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.any(AuthInvalidError));
  });
});
