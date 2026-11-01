// src/utils/password.ts
import bcrypt from 'bcrypt';

const BCRYPT_COST = 12;

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length === 0) {
    throw new Error('Password must not be empty');
  }
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
