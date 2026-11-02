import { AiKeyInvalidError, AiQuotaExceededError, AiProviderError } from '../utils/errors.js';

const TIMEOUT_MS = 20_000;

export async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (res.status === 401 || res.status === 403) {
      throw new AiKeyInvalidError();
    }
    if (res.status === 429) {
      throw new AiQuotaExceededError();
    }
    if (!res.ok) {
      throw new AiProviderError(`Provider returned HTTP ${res.status}.`);
    }

    return res.json();
  } catch (err) {
    if (
      err instanceof AiKeyInvalidError ||
      err instanceof AiQuotaExceededError ||
      err instanceof AiProviderError
    ) {
      throw err;
    }
    throw new AiProviderError('Could not reach the AI provider.');
  } finally {
    clearTimeout(timer);
  }
}

export async function getJson(url: string, headers: Record<string, string>): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    if (res.status === 401 || res.status === 403) {
      throw new AiKeyInvalidError();
    }
    if (res.status === 429) {
      throw new AiQuotaExceededError();
    }
    if (!res.ok) {
      throw new AiProviderError(`Provider returned HTTP ${res.status}.`);
    }

    return res.json();
  } catch (err) {
    if (
      err instanceof AiKeyInvalidError ||
      err instanceof AiQuotaExceededError ||
      err instanceof AiProviderError
    ) {
      throw err;
    }
    throw new AiProviderError('Could not reach the AI provider.');
  } finally {
    clearTimeout(timer);
  }
}

/** Builds the system prompt used by all providers for task extraction. */
export function buildTaskPrompt(): string {
  return [
    'You are a task extraction engine.',
    "Convert the user's sentence into a single task object.",
    'Rules:',
    '- title: short imperative phrase (max 200 chars).',
    '- description: extra details or null.',
    '- priority: one of "low", "medium", "high", "urgent".',
    '- due_date: ISO 8601 datetime string, or null if no date was mentioned.',
    '- confidence: 0..1 — how confident you are in this extraction.',
    'Respond ONLY with a JSON object that matches the provided schema.',
  ].join('\n');
}
