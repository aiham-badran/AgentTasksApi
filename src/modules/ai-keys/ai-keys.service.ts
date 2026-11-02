// src/modules/ai-keys/ai-keys.service.ts
import { and, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { apiKeys, type ApiKey } from '../../db/schema.js';
import { env } from '../../config/env.js';
import { encrypt, decrypt, maskKey, getMasterKey } from '../../utils/encryption.js';
import {
  AiKeyInvalidError,
  AiQuotaExceededError,
  AiProviderError,
  AiKeyNotFoundError,
} from '../../utils/errors.js';
import { validateProviderKey } from '../../providers/validate.js';
import { PROVIDER_CONFIG } from '../../providers/registry.js';
import type { ProviderId } from '../../providers/registry.js';
import type { CreateAiKeyInput } from './ai-keys.schemas.js';
import { getProvider } from '../../providers/index.js';
import type { ModelInfo } from '../../providers/types.js';

const masterKey = getMasterKey(env.MASTER_ENCRYPTION_KEY);

// ─── Row → API shape (never exposes secrets) ───────────────
function serialize(row: ApiKey) {
  return {
    id: row.id,
    provider: row.provider,
    masked_key: `${row.keyPrefix.slice(0, 4)}...${row.keyPrefix.slice(-4)}`,
    is_active: row.isActive,
    last_validated_at: row.lastValidatedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

// ─── Internal: decrypt a stored key for validation ─────────
function decryptStored(row: ApiKey): string {
  return decrypt(
    {
      ciphertext: row.encryptedKey,
      iv: row.iv,
      authTag: row.authTag,
    },
    masterKey,
  );
}

// ─── Save (upsert) ─────────────────────────────────────────
export async function saveAiKey(
  userId: string,
  input: CreateAiKeyInput,
): Promise<{ data: ReturnType<typeof serialize>; created: boolean }> {
  const provider = input.provider as ProviderId;

  const validation = await validateProviderKey(provider, input.api_key);

  if (validation.status === 'invalid_key') {
    throw new AiKeyInvalidError(PROVIDER_CONFIG[provider].displayName);
  }
  if (validation.status === 'quota_exceeded') {
    throw new AiQuotaExceededError(PROVIDER_CONFIG[provider].displayName);
  }
  if (validation.status === 'provider_error') {
    throw new AiProviderError(validation.message);
  }

  const { ciphertext, iv, authTag } = encrypt(input.api_key, masterKey);
  const keyPrefix = maskKey(input.api_key);

  const existing = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, provider)))
    .limit(1);

  const now = new Date();

  if (existing.length > 0) {
    const [row] = await db
      .update(apiKeys)
      .set({
        encryptedKey: ciphertext,
        iv,
        authTag,
        keyPrefix,
        isActive: true,
        lastValidatedAt: now,
        updatedAt: now,
      })
      .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, provider)))
      .returning();
    return { data: serialize(row!), created: false };
  }

  const [row] = await db
    .insert(apiKeys)
    .values({
      userId,
      provider,
      encryptedKey: ciphertext,
      iv,
      authTag,
      keyPrefix,
      isActive: true,
      lastValidatedAt: now,
    })
    .returning();

  return { data: serialize(row!), created: true };
}

// ─── List ──────────────────────────────────────────────────
export async function listAiKeys(userId: string) {
  const rows = await db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
  return rows.map(serialize);
}

// ─── Delete ────────────────────────────────────────────────
export async function deleteAiKey(userId: string, provider: ProviderId): Promise<void> {
  const result = await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, provider)))
    .returning({ id: apiKeys.id });

  if (result.length === 0) {
    throw new AiKeyNotFoundError();
  }
}

// ─── Re-validate ───────────────────────────────────────────
export async function revalidateAiKey(userId: string, provider: ProviderId) {
  const rows = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, provider)))
    .limit(1);

  const row = rows[0];
  if (!row) throw new AiKeyNotFoundError();

  const plaintext = decryptStored(row);
  const result = await validateProviderKey(provider, plaintext);

  if (result.status === 'invalid_key') {
    throw new AiKeyInvalidError(PROVIDER_CONFIG[provider].displayName);
  }
  if (result.status === 'quota_exceeded') {
    throw new AiQuotaExceededError(PROVIDER_CONFIG[provider].displayName);
  }
  if (result.status === 'provider_error') {
    throw new AiProviderError(result.message);
  }

  await db
    .update(apiKeys)
    .set({ lastValidatedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, provider)));

  return result;
}

// ─── Provider List ───────────────────────────────────────────
export async function listProviderModels(
  userId: string,
  provider: ProviderId,
): Promise<ModelInfo[]> {
  const rows = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, provider)))
    .limit(1);

  const row = rows[0];
  if (!row) throw new AiKeyNotFoundError();

  const plaintext = decryptStored(row);
  return getProvider(provider).listModels(plaintext);
}
