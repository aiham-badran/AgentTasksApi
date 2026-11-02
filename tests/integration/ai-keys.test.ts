// tests/integration/ai-keys.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { resetDb } from '../helpers/db.js';

const app = createApp();

// ═══════════════ Helpers ═══════════════
async function registerUser(email = 'user@example.com') {
  const res = await request(app).post('/api/v1/auth/register').send({
    email,
    password: 'Password123',
    name: 'Test User',
  });
  return { token: res.body.token as string, user: res.body.user };
}

function mockFetchOk(body: unknown = { data: [] }) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(new Response(JSON.stringify(body), { status: 200 }));
}

function mockFetchStatus(status: number) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status }));
}

beforeEach(() => {
  resetDb();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════
// POST /api/v1/settings/ai-keys
// ═══════════════════════════════════════════════════
describe('POST /api/v1/settings/ai-keys', () => {
  it('saves a valid key and returns masked value only', async () => {
    const { token } = await registerUser();
    mockFetchOk();

    const res = await request(app)
      .post('/api/v1/settings/ai-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ provider: 'groq', api_key: 'gsk_abcdefghijklmnop' });

    expect(res.status).toBe(201);
    expect(res.body.provider).toBe('groq');
    expect(res.body.masked_key).toBe('gsk_...mnop');
    expect(res.body.is_active).toBe(true);
    // ⚠️ never expose the full key
    expect(JSON.stringify(res.body)).not.toContain('abcdefghijklmnop');
  });

  it('rejects without auth (401)', async () => {
    const res = await request(app)
      .post('/api/v1/settings/ai-keys')
      .send({ provider: 'groq', api_key: 'gsk_test' });
    expect(res.status).toBe(401);
  });

  it('rejects unsupported provider (422)', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .post('/api/v1/settings/ai-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ provider: 'mistral', api_key: 'x' });
    expect(res.status).toBe(422);
  });

  it('rejects missing api_key (422)', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .post('/api/v1/settings/ai-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ provider: 'groq' });
    expect(res.status).toBe(422);
  });

  it('returns 401 AI_KEY_INVALID when provider rejects the key', async () => {
    const { token } = await registerUser();
    mockFetchStatus(401);

    const res = await request(app)
      .post('/api/v1/settings/ai-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ provider: 'groq', api_key: 'bad-key-provide' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AI_KEY_INVALID');
  });

  it('returns 429 AI_QUOTA_EXCEEDED when provider returns 429', async () => {
    const { token } = await registerUser();
    mockFetchStatus(429);

    const res = await request(app)
      .post('/api/v1/settings/ai-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ provider: 'groq', api_key: 'quota-key' });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('AI_QUOTA_EXCEEDED');
  });

  it('upserts when provider already exists (updates the key)', async () => {
    const { token } = await registerUser();
    mockFetchOk();

    await request(app)
      .post('/api/v1/settings/ai-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ provider: 'groq', api_key: 'gsk_old1234' });

    mockFetchOk();
    const res = await request(app)
      .post('/api/v1/settings/ai-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ provider: 'groq', api_key: 'gsk_new5678' });

    expect(res.status).toBe(200); // update, not create
    expect(res.body.masked_key).toBe('gsk_...5678');
  });
});

// ═══════════════════════════════════════════════════
// GET /api/v1/settings/ai-keys
// ═══════════════════════════════════════════════════
describe('GET /api/v1/settings/ai-keys', () => {
  it('returns an empty array when no keys exist', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .get('/api/v1/settings/ai-keys')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns only the current user keys (isolation)', async () => {
    const { token: tokenA } = await registerUser('a@example.com');
    const { token: tokenB } = await registerUser('b@example.com');

    mockFetchOk();
    await request(app)
      .post('/api/v1/settings/ai-keys')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ provider: 'groq', api_key: 'gsk_aaaa1111' });

    mockFetchOk();
    await request(app)
      .post('/api/v1/settings/ai-keys')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ provider: 'groq', api_key: 'gsk_bbbb2222' });

    const res = await request(app)
      .get('/api/v1/settings/ai-keys')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].masked_key).toBe('gsk_...1111');
  });

  it('never returns encrypted_key / iv / auth_tag', async () => {
    const { token } = await registerUser();
    mockFetchOk();
    await request(app)
      .post('/api/v1/settings/ai-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ provider: 'groq', api_key: 'gsk_secretkey123' });

    const res = await request(app)
      .get('/api/v1/settings/ai-keys')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body).toHaveLength(1);
    const keys = Object.keys(res.body[0]!);

    // ⚠️ تحقق من أسماء المفاتيح — دقيق ولا يقع في فخ "substring"
    expect(keys).not.toContain('encrypted_key');
    expect(keys).not.toContain('encryptedKey');
    expect(keys).not.toContain('auth_tag');
    expect(keys).not.toContain('authTag');
    expect(keys).not.toContain('iv');

    // ✅ تأكد أن الحقول المتوقعة موجودة (حماية من "صدفة النجاح")
    expect(keys).toEqual(
      expect.arrayContaining(['id', 'provider', 'masked_key', 'is_active', 'last_validated_at']),
    );
  });
});

// ═══════════════════════════════════════════════════
// DELETE /api/v1/settings/ai-keys/:provider
// ═══════════════════════════════════════════════════
describe('DELETE /api/v1/settings/ai-keys/:provider', () => {
  it('deletes an existing key and returns 204', async () => {
    const { token } = await registerUser();
    mockFetchOk();
    await request(app)
      .post('/api/v1/settings/ai-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ provider: 'groq', api_key: 'gsk_xxxx1234' });

    const res = await request(app)
      .delete('/api/v1/settings/ai-keys/groq')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);

    const list = await request(app)
      .get('/api/v1/settings/ai-keys')
      .set('Authorization', `Bearer ${token}`);
    expect(list.body).toEqual([]);
  });

  it('returns 404 when key does not exist', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .delete('/api/v1/settings/ai-keys/groq')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('AI_KEY_NOT_FOUND');
  });

  it('rejects unsupported provider (422)', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .delete('/api/v1/settings/ai-keys/mistral')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(422);
  });
});

// ═══════════════════════════════════════════════════
// POST /api/v1/settings/ai-keys/:provider/validate
// ═══════════════════════════════════════════════════
describe('POST /api/v1/settings/ai-keys/:provider/validate', () => {
  it('returns valid:true for a working key', async () => {
    const { token } = await registerUser();
    mockFetchOk();
    await request(app)
      .post('/api/v1/settings/ai-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ provider: 'openrouter', api_key: 'sk-or-v1-test' });

    mockFetchOk({ data: { usage: 0, limit: 100 } });
    const res = await request(app)
      .post('/api/v1/settings/ai-keys/openrouter/validate')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  it('updates last_validated_at on success', async () => {
    const { token } = await registerUser();
    mockFetchOk();
    await request(app)
      .post('/api/v1/settings/ai-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ provider: 'groq', api_key: 'gsk_test1234' });

    mockFetchOk();
    await request(app)
      .post('/api/v1/settings/ai-keys/groq/validate')
      .set('Authorization', `Bearer ${token}`);

    const list = await request(app)
      .get('/api/v1/settings/ai-keys')
      .set('Authorization', `Bearer ${token}`);
    expect(list.body[0].last_validated_at).toBeTruthy();
  });

  it('returns 401 AI_KEY_INVALID when provider rejects (key revoked)', async () => {
    const { token } = await registerUser();
    mockFetchOk();
    await request(app)
      .post('/api/v1/settings/ai-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ provider: 'groq', api_key: 'gsk_revoked1234' });

    mockFetchStatus(401);
    const res = await request(app)
      .post('/api/v1/settings/ai-keys/groq/validate')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AI_KEY_INVALID');
  });
});
