// tests/unit/providers.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getProvider } from '../../src/providers/index.js';
import { isProviderId } from '../../src/providers/registry.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('provider registry', () => {
  it('isProviderId returns true for valid providers', () => {
    expect(isProviderId('groq')).toBe(true);
    expect(isProviderId('google')).toBe(true);
    expect(isProviderId('openrouter')).toBe(true);
  });

  it('isProviderId returns false for invalid providers', () => {
    expect(isProviderId('mistral')).toBe(false);
    expect(isProviderId('')).toBe(false);
  });

  it('getProvider returns a provider instance for each valid id', () => {
    for (const id of ['groq', 'google', 'openrouter'] as const) {
      const provider = getProvider(id);
      expect(provider.id).toBe(id);
      expect(typeof provider.validateKey).toBe('function');
      expect(typeof provider.listModels).toBe('function');
      expect(typeof provider.parseTask).toBe('function');
    }
  });

  it('getProvider throws for invalid id', () => {
    // @ts-expect-error testing runtime guard
    expect(() => getProvider('mistral')).toThrow(/unknown provider/i);
  });
});

// ═══════════════════════════════════════════════════
// listModels — لكل مزود
// ═══════════════════════════════════════════════════
describe('listModels', () => {
  it('groq: parses /openai/v1/models response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          object: 'list',
          data: [
            { id: 'openai/gpt-oss-120b', created: 1721174400, object: 'model', owned_by: 'groq' },
            { id: 'openai/gpt-oss-20b', created: 1721174400, object: 'model', owned_by: 'groq' },
          ],
        }),
        { status: 200 },
      ),
    );

    const provider = getProvider('groq');
    const models = await provider.listModels('gsk_test');

    expect(models).toHaveLength(2);
    expect(models[0]!.id).toBe('openai/gpt-oss-120b');
    expect(models[0]!.provider).toBe('groq');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/models',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer gsk_test' }),
      }),
    );
  });

  it('google: parses v1beta/models and handles pagination', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            models: [{ name: 'models/gemini-2.0-flash', displayName: 'Gemini 2.0 Flash' }],
            nextPageToken: 'page2',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            models: [{ name: 'models/gemini-1.5-pro', displayName: 'Gemini 1.5 Pro' }],
          }),
          { status: 200 },
        ),
      );

    const provider = getProvider('google');
    const models = await provider.listModels('AIza_test');

    expect(models).toHaveLength(2);
    expect(models[0]!.id).toBe('gemini-2.0-flash');
    expect(models[1]!.id).toBe('gemini-1.5-pro');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // second call must include pageToken
    expect(fetchMock.mock.calls[1]![0]).toContain('pageToken=page2');
  });

  it('openrouter: parses /api/v1/models response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
            { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
          ],
        }),
        { status: 200 },
      ),
    );

    const provider = getProvider('openrouter');
    const models = await provider.listModels('sk-or-v1-test');

    expect(models).toHaveLength(2);
    expect(models[0]!.id).toBe('openai/gpt-4o-mini');
    expect(models[1]!.id).toBe('anthropic/claude-3.5-sonnet');
  });

  it('throws AiKeyInvalidError when listModels returns 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 401 }));

    const provider = getProvider('groq');
    await expect(provider.listModels('bad')).rejects.toMatchObject({
      code: 'AI_KEY_INVALID',
    });
  });
});

// ═══════════════════════════════════════════════════
// parseTask — لكل مزود
// ═══════════════════════════════════════════════════
describe('parseTask', () => {
  const expectedDraft = {
    title: 'Call Sara',
    description: null,
    priority: 'medium',
    due_date: '2026-11-02T17:00:00.000Z',
    confidence: 0.92,
  };

  it('groq: sends response_format json_schema and parses output', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(expectedDraft) } }],
        }),
        { status: 200 },
      ),
    );

    const provider = getProvider('groq');
    const draft = await provider.parseTask('call sara tomorrow 5pm', 'gsk_test');

    expect(draft).toEqual(expectedDraft);

    const call = fetchMock.mock.calls[0]!;
    expect(call[0]).toBe('https://api.groq.com/openai/v1/chat/completions');
    const body = JSON.parse(call[1]!.body as string);
    expect(body.response_format.type).toBe('json_schema');
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.messages).toHaveLength(2); // system + user
  });

  it('google: sends responseJsonSchema and parses output', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(expectedDraft) }] } }],
        }),
        { status: 200 },
      ),
    );

    const provider = getProvider('google');
    const draft = await provider.parseTask('call sara tomorrow 5pm', 'AIza_test');

    expect(draft).toEqual(expectedDraft);
  });

  it('openrouter: sends response_format json_schema and parses output', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(expectedDraft) } }],
        }),
        { status: 200 },
      ),
    );

    const provider = getProvider('openrouter');
    const draft = await provider.parseTask('call sara tomorrow 5pm', 'sk-or-test');

    expect(draft).toEqual(expectedDraft);
  });

  it('rejects when LLM returns malformed JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [{ message: { content: 'not json' } }] }), {
        status: 200,
      }),
    );

    const provider = getProvider('groq');
    await expect(provider.parseTask('x', 'key')).rejects.toMatchObject({
      code: 'AI_PROVIDER_ERROR',
    });
  });

  it('rejects when LLM output fails schema validation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ title: 123 }) } }],
        }),
        { status: 200 },
      ),
    );

    const provider = getProvider('groq');
    await expect(provider.parseTask('x', 'key')).rejects.toMatchObject({
      code: 'AI_PROVIDER_ERROR',
    });
  });

  it('maps 429 to AiQuotaExceededError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 429 }));

    const provider = getProvider('groq');
    await expect(provider.parseTask('x', 'key')).rejects.toMatchObject({
      code: 'AI_QUOTA_EXCEEDED',
    });
  });

  it('maps 401 to AiKeyInvalidError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 401 }));

    const provider = getProvider('groq');
    await expect(provider.parseTask('x', 'key')).rejects.toMatchObject({
      code: 'AI_KEY_INVALID',
    });
  });
});
