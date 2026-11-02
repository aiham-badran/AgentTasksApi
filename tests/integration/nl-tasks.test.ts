// tests/integration/nl-tasks.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { resetDb } from '../helpers/db.js';

const app = createApp();

// ═══════════════ Helpers ═══════════════
function mockOk(): void {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 200 }));
}

function mockStatus(status: number): void {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status }));
}

function mockLlm(draft: Record<string, unknown>): void {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(draft) } }],
      }),
      { status: 200 },
    ),
  );
}

const validDraft = {
  title: 'Call Sara',
  description: null,
  priority: 'medium',
  due_date: '2026-11-02T17:00:00.000Z',
  confidence: 0.92,
};

let token: string;

async function registerUser(email = 'nl@example.com'): Promise<void> {
  const res = await request(app).post('/api/v1/auth/register').send({
    email,
    password: 'Password123',
    name: 'NL User',
  });
  token = res.body.token;
}

async function addKey(provider: 'groq' | 'google' | 'openrouter' = 'groq'): Promise<void> {
  mockOk();
  await request(app)
    .post('/api/v1/settings/ai-keys')
    .set('Authorization', `Bearer ${token}`)
    .send({ provider, api_key: `key_${provider}_1234` });
}

beforeEach(async () => {
  resetDb();
  await registerUser();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════
// Happy path
// ═══════════════════════════════════════════════════
describe('POST /api/v1/tasks/nl — success', () => {
  it('creates a task from natural language', async () => {
    await addKey('groq');
    mockLlm(validDraft);

    const res = await request(app)
      .post('/api/v1/tasks/nl')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'call sara tomorrow 5pm' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('Call Sara');
    expect(res.body.priority).toBe('medium');
    expect(res.body.status).toBe('pending');
    expect(res.body.source).toBe('ai_nl'); // ⭐
    expect(res.body.userId).toBeUndefined();
  });

  it('stores provider, model, confidence, raw_text in metadata', async () => {
    await addKey('groq');
    mockLlm(validDraft);

    const res = await request(app)
      .post('/api/v1/tasks/nl')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'call sara tomorrow 5pm' });

    expect(res.body.metadata).toEqual({
      provider: 'groq',
      model: 'openai/gpt-oss-120b',
      confidence: 0.92,
      raw_text: 'call sara tomorrow 5pm',
    });
  });

  it('persists due_date as ISO date', async () => {
    await addKey('groq');
    mockLlm(validDraft);

    const res = await request(app)
      .post('/api/v1/tasks/nl')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'call sara tomorrow 5pm' });

    expect(new Date(res.body.dueDate).toISOString()).toBe('2026-11-02T17:00:00.000Z');
  });

  it('the new task appears in GET /tasks', async () => {
    await addKey('groq');
    mockLlm(validDraft);

    await request(app)
      .post('/api/v1/tasks/nl')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'call sara' });

    const list = await request(app).get('/api/v1/tasks').set('Authorization', `Bearer ${token}`);

    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].source).toBe('ai_nl');
  });
});

// ═══════════════════════════════════════════════════
// Provider selection
// ═══════════════════════════════════════════════════
describe('POST /api/v1/tasks/nl — provider selection', () => {
  it('uses explicit provider when specified', async () => {
    await addKey('groq');
    await addKey('openrouter');

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(validDraft) } }],
        }),
        { status: 200 },
      ),
    );

    const res = await request(app)
      .post('/api/v1/tasks/nl')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'call sara', provider: 'openrouter' });

    expect(res.status).toBe(201);
    expect(res.body.metadata.provider).toBe('openrouter');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('openrouter.ai'),
      expect.anything(),
    );
  });

  it('falls back to first available provider (groq) when unspecified', async () => {
    await addKey('groq');
    await addKey('openrouter');

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(validDraft) } }],
        }),
        { status: 200 },
      ),
    );

    const res = await request(app)
      .post('/api/v1/tasks/nl')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'call sara' });

    expect(res.body.metadata.provider).toBe('groq');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('api.groq.com'),
      expect.anything(),
    );
  });

  it('uses openrouter when it is the only available key', async () => {
    await addKey('openrouter');

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(validDraft) } }],
        }),
        { status: 200 },
      ),
    );

    const res = await request(app)
      .post('/api/v1/tasks/nl')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'call sara' });

    expect(res.body.metadata.provider).toBe('openrouter');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('openrouter.ai'),
      expect.anything(),
    );
  });

  it('uses explicit model when specified', async () => {
    await addKey('groq');

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(validDraft) } }],
        }),
        { status: 200 },
      ),
    );

    const res = await request(app)
      .post('/api/v1/tasks/nl')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'call sara', model: 'openai/gpt-oss-20b' });

    expect(res.body.metadata.model).toBe('openai/gpt-oss-20b');
    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(body.model).toBe('openai/gpt-oss-20b');
  });
});

// ═══════════════════════════════════════════════════
// Validation
// ═══════════════════════════════════════════════════
describe('POST /api/v1/tasks/nl — validation', () => {
  it('rejects missing auth (401)', async () => {
    const res = await request(app).post('/api/v1/tasks/nl').send({ text: 'call sara' });
    expect(res.status).toBe(401);
  });

  it('rejects empty text (422)', async () => {
    await addKey('groq');
    const res = await request(app)
      .post('/api/v1/tasks/nl')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: '' });
    expect(res.status).toBe(422);
  });

  it('rejects text > 1000 chars (422)', async () => {
    await addKey('groq');
    const res = await request(app)
      .post('/api/v1/tasks/nl')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'a'.repeat(1001) });
    expect(res.status).toBe(422);
  });

  it('rejects unsupported provider (422)', async () => {
    await addKey('groq');
    const res = await request(app)
      .post('/api/v1/tasks/nl')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'call sara', provider: 'mistral' });
    expect(res.status).toBe(422);
  });
});

// ═══════════════════════════════════════════════════
// AI key errors — the critical distinction
// ═══════════════════════════════════════════════════
describe('POST /api/v1/tasks/nl — AI key errors', () => {
  it('returns 428 AI_KEY_MISSING when user has no key', async () => {
    const res = await request(app)
      .post('/api/v1/tasks/nl')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'call sara' });

    expect(res.status).toBe(428);
    expect(res.body.error.code).toBe('AI_KEY_MISSING');
    expect(res.body.error.hint).toContain('/settings/ai-keys');
  });

  it('returns 428 when explicit provider has no key', async () => {
    await addKey('groq');
    const res = await request(app)
      .post('/api/v1/tasks/nl')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'call sara', provider: 'openrouter' });

    expect(res.status).toBe(428);
    expect(res.body.error.code).toBe('AI_KEY_MISSING');
  });

  it('returns 401 AI_KEY_INVALID when provider rejects the key', async () => {
    await addKey('groq');
    mockStatus(401);

    const res = await request(app)
      .post('/api/v1/tasks/nl')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'call sara' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AI_KEY_INVALID');
  });

  it('returns 429 AI_QUOTA_EXCEEDED when provider quota is exhausted', async () => {
    await addKey('groq');
    mockStatus(429);

    const res = await request(app)
      .post('/api/v1/tasks/nl')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'call sara' });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('AI_QUOTA_EXCEEDED');
    expect(res.body.error.retryable).toBe(true);
  });

  it('returns 502 AI_PROVIDER_ERROR when LLM returns invalid JSON', async () => {
    await addKey('groq');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: 'not-json' } }],
        }),
        { status: 200 },
      ),
    );

    const res = await request(app)
      .post('/api/v1/tasks/nl')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'call sara' });

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('AI_PROVIDER_ERROR');
  });
});

// ═══════════════════════════════════════════════════
// Isolation
// ═══════════════════════════════════════════════════
describe('POST /api/v1/tasks/nl — isolation', () => {
  it("does not use another user's AI key", async () => {
    // User A has key
    await addKey('groq');

    // User B registers, no key
    const userBRes = await request(app).post('/api/v1/auth/register').send({
      email: 'b@example.com',
      password: 'Password123',
      name: 'User B',
    });

    const res = await request(app)
      .post('/api/v1/tasks/nl')
      .set('Authorization', `Bearer ${userBRes.body.token}`)
      .send({ text: 'call sara' });

    expect(res.status).toBe(428);
    expect(res.body.error.code).toBe('AI_KEY_MISSING');
  });
});
