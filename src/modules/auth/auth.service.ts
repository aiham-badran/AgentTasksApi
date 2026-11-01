// src/modules/auth/auth.service.ts
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { signToken } from '../../utils/jwt.js';
import { AuthEmailExistsError, AuthInvalidError } from '../../utils/errors.js';
import type { RegisterInput, LoginInput } from './auth.schemas.js';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

export interface AuthResult {
  user: PublicUser;
  token: string;
}

function toPublicUser(user: typeof users.$inferSelect): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

  if (existing.length > 0) {
    throw new AuthEmailExistsError();
  }

  const passwordHash = await hashPassword(input.password);

  const inserted = await db
    .insert(users)
    .values({
      email: input.email,
      passwordHash,
      name: input.name,
    })
    .returning();

  const user = inserted[0];
  if (!user) {
    throw new Error('Failed to create user');
  }

  const token = signToken({ sub: user.id, email: user.email });

  return { user: toPublicUser(user), token };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const found = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

  const user = found[0];
  if (!user) {
    // ⚠️ Same error as wrong password — don't leak email existence
    throw new AuthInvalidError();
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new AuthInvalidError();
  }

  const token = signToken({ sub: user.id, email: user.email });

  return { user: toPublicUser(user), token };
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const found = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  const user = found[0];
  if (!user) {
    throw new AuthInvalidError();
  }

  return toPublicUser(user);
}
