import { and, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { apiKeys, type ApiKey } from '../../db/schema.js';
import { env } from '../../config/env.js';
import { decrypt, getMasterKey } from '../../utils/encryption.js';
import { getProvider } from '../../providers/index.js';
import { PROVIDER_IDS, type ProviderId } from '../../providers/registry.js';
import type { TaskDraft } from '../../providers/types.js';
import { AiKeyMissingError, AiKeyInvalidError, AiQuotaExceededError } from '../../utils/errors.js';
import { createTaskFromAi } from '../tasks/tasks.service.js';
import type { CreateNlTaskInput } from './nl-tasks.schemas.js';

const masterKey = getMasterKey(env.MASTER_ENCRYPTION_KEY);

// ─── Pick key: explicit provider, or first available in registry order ───
async function pickKey(
  userId: string,
  requestedProvider?: ProviderId,
): Promise<{ row: ApiKey; provider: ProviderId }> {
  if (requestedProvider) {
    const rows = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, requestedProvider)))
      .limit(1);

    const row = rows[0];
    if (!row) throw new AiKeyMissingError();
    return { row, provider: requestedProvider };
  }

  const allRows = await db.select().from(apiKeys).where(eq(apiKeys.userId, userId));

  if (allRows.length === 0) throw new AiKeyMissingError();

  for (const id of PROVIDER_IDS) {
    const row = allRows.find((r) => r.provider === id);
    if (row) return { row, provider: id };
  }

  throw new AiKeyMissingError();
}

// ─── Decrypt the stored key ──────────────────────────────────
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

// ─── Main entry ─────────────────────────────────────────────
export async function createTaskFromNl(userId: string, input: CreateNlTaskInput) {
  const { row, provider } = await pickKey(userId, input.provider);
  const adapter = getProvider(provider);
  const plaintextKey = decryptStored(row);
  const model = input.model ?? adapter.defaultModel;

  let draft: TaskDraft;
  try {
    draft = await adapter.parseTask(input.text, plaintextKey, model);
  } catch (err) {
    // Re-throw with provider display name for better UX
    if (err instanceof AiKeyInvalidError) {
      throw new AiKeyInvalidError(adapter.displayName);
    }
    if (err instanceof AiQuotaExceededError) {
      throw new AiQuotaExceededError(adapter.displayName);
    }
    throw err; // AiProviderError passes through
  }

  return createTaskFromAi(
    userId,
    {
      title: draft.title,
      description: draft.description,
      priority: draft.priority,
      due_date: draft.due_date,
    },
    {
      provider,
      model,
      confidence: draft.confidence,
      raw_text: input.text,
    },
  );
}
