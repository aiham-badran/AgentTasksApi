// src/providers/validate.ts
import { PROVIDER_CONFIG, type ProviderId } from './registry.js';
import type { ValidateResult } from './types.js';

const TIMEOUT_MS = 10_000;

/**
 * Validates an API key by hitting the provider's models/key endpoint.
 * Maps HTTP status codes to structured results, so callers can distinguish
 * "invalid key" (401) from "quota exceeded" (429) — a critical distinction.
 */
export async function validateProviderKey(
  provider: ProviderId,
  apiKey: string,
): Promise<ValidateResult> {
  const config = PROVIDER_CONFIG[provider];

  let url = config.validateUrl;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (config.authStyle === 'bearer') {
    headers.Authorization = `Bearer ${apiKey}`;
  } else {
    url = `${url}?key=${encodeURIComponent(apiKey)}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    if (res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const usage = extractUsage(provider, body);
      return { valid: true, status: 'ok', usage };
    }

    if (res.status === 401 || res.status === 403) {
      return {
        valid: false,
        status: 'invalid_key',
        message: 'Provider rejected the key.',
      };
    }

    if (res.status === 429) {
      return {
        valid: false,
        status: 'quota_exceeded',
        message: 'Provider quota exceeded.',
      };
    }

    return {
      valid: false,
      status: 'provider_error',
      message: `Provider returned HTTP ${res.status}.`,
    };
  } catch {
    return {
      valid: false,
      status: 'provider_error',
      message: 'Could not reach the provider.',
    };
  } finally {
    clearTimeout(timer);
  }
}

function extractUsage(
  provider: ProviderId,
  body: Record<string, unknown>,
): ValidateResult['usage'] {
  if (provider === 'openrouter') {
    const data = (body.data ?? {}) as Record<string, unknown>;
    const usage = typeof data.usage === 'number' ? data.usage : null;
    const limit = typeof data.limit === 'number' ? data.limit : null;
    return { used: usage, limit };
  }
  return undefined;
}
