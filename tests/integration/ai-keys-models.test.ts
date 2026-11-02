// tests/integration/ai-key-models.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { resetDb } from '../helpers/db.js';

const app = createApp();

async function registerUser(email = 'models@example.com') {
  const res = await request(app).post('/api/v1/auth/register').send({
    email,
    password: 'Password123',
    name: 'Models User',
  });
  return { token: res.body.token as string };
}

beforeEach(() => resetDb());
afterEach(() => vi.restoreAllMocks());

describe('GET /api/v1/settings/ai-keys/:provider/models', () => {
  it('returns models list for a configured provider', async () => {
    const { token } = await registerUser();

    // Save key (validate → mock 200)
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await request(app)
      .post('/api/v1/settings/ai-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ provider: 'groq', api_key: 'gsk_test1234' });

    // listModels → mock 200
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ id: 'openai/gpt-oss-120b', created: 0, object: 'model', owned_by: 'groq' }],
        }),
        { status: 200 },
      ),
    );

    const res = await request(app)
      .get('/api/v1/settings/ai-keys/groq/models')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('openai/gpt-oss-120b');
  });

  it('returns 404 when provider has no saved key', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .get('/api/v1/settings/ai-keys/groq/models')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('AI_KEY_NOT_FOUND');
  });

  it('returns 422 for unsupported provider', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .get('/api/v1/settings/ai-keys/mistral/models')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(422);
  });

  it('returns 401 AI_KEY_INVALID when provider rejects the stored key', async () => {
    const { token } = await registerUser();

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await request(app)
      .post('/api/v1/settings/ai-keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ provider: 'groq', api_key: 'gsk_test1234' });

    // listModels → 401 (revoked)
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('{}', { status: 401 }));

    const res = await request(app)
      .get('/api/v1/settings/ai-keys/groq/models')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AI_KEY_INVALID');
  });
});
