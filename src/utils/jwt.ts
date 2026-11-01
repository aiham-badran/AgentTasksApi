// src/utils/jwt.ts
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AuthInvalidError } from './errors.js';

export interface JwtPayload {
  sub: string;
  email: string;
}

export function signToken(payload: JwtPayload, options?: { expiresIn?: string }): string {
  const expiresIn = options?.expiresIn ?? env.JWT_EXPIRES_IN;
  return jwt.sign({ sub: payload.sub, email: payload.email }, env.JWT_SECRET, {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (typeof decoded === 'string') {
      throw new AuthInvalidError();
    }
    if (!decoded.sub || typeof decoded.sub !== 'string') {
      throw new AuthInvalidError();
    }
    if (!decoded.email || typeof decoded.email !== 'string') {
      throw new AuthInvalidError();
    }

    return { sub: decoded.sub, email: decoded.email };
  } catch (err) {
    if (err instanceof AuthInvalidError) throw err;
    throw new AuthInvalidError();
  }
}
