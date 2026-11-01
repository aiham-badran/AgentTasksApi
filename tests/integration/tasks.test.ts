// tests/integration/tasks.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
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

async function createTask(token: string, overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/api/v1/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Test Task', ...overrides });
  return res;
}

beforeEach(() => {
  resetDb();
});

// ═══════════════════════════════════════════════════
// POST /api/v1/tasks
// ═══════════════════════════════════════════════════
describe('POST /api/v1/tasks', () => {
  it('creates a task and returns 201', async () => {
    const { token } = await registerUser();
    const res = await createTask(token, { title: 'Buy milk' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Buy milk');
    expect(res.body.status).toBe('pending');
    expect(res.body.priority).toBe('medium');
    expect(res.body.source).toBe('manual');
    expect(res.body.id).toBeDefined();
    expect(res.body.userId).toBeUndefined(); // ownership not exposed
  });

  it('accepts optional fields (description, priority, due_date)', async () => {
    const { token } = await registerUser();
    const due = new Date(Date.now() + 86400000).toISOString();
    const res = await createTask(token, {
      title: 'With extras',
      description: 'Some details',
      priority: 'high',
      due_date: due,
    });

    expect(res.status).toBe(201);
    expect(res.body.description).toBe('Some details');
    expect(res.body.priority).toBe('high');
    expect(new Date(res.body.dueDate).toISOString()).toBe(due);
  });

  it('rejects empty title (422)', async () => {
    const { token } = await registerUser();
    const res = await createTask(token, { title: '' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.details).toHaveProperty('title');
  });

  it('rejects title over 200 chars (422)', async () => {
    const { token } = await registerUser();
    const res = await createTask(token, { title: 'x'.repeat(201) });
    expect(res.status).toBe(422);
  });

  it('rejects invalid priority (422)', async () => {
    const { token } = await registerUser();
    const res = await createTask(token, { priority: 'critical' });
    expect(res.status).toBe(422);
    expect(res.body.error.details).toHaveProperty('priority');
  });

  it('rejects invalid due_date (422)', async () => {
    const { token } = await registerUser();
    const res = await createTask(token, { due_date: 'tomorrow' });
    expect(res.status).toBe(422);
  });

  it('rejects requests without auth (401)', async () => {
    const res = await request(app).post('/api/v1/tasks').send({ title: 'No auth' });
    expect(res.status).toBe(401);
  });

  it.only('ignores injected source/metadata fields (always manual)', async () => {
    const { token } = await registerUser();
    const res = await createTask(token, {
      title: 'Try to inject',
      source: 'ai_nl',
      metadata: { hacked: true },
    });
    expect(res.status).toBe(201);
    expect(res.body.source).toBe('manual');
    expect(res.body.metadata).toBeNull();
  });
});

// ═══════════════════════════════════════════════════
// GET /api/v1/tasks — List + filters + pagination
// ═══════════════════════════════════════════════════
describe('GET /api/v1/tasks', () => {
  it('returns only current user tasks (ownership isolation)', async () => {
    const { token: tokenA } = await registerUser('a@example.com');
    const { token: tokenB } = await registerUser('b@example.com');

    await createTask(tokenA, { title: 'A task' });
    await createTask(tokenB, { title: 'B task' });

    const res = await request(app).get('/api/v1/tasks').set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('A task');
  });

  it('returns empty list with valid pagination meta when no tasks', async () => {
    const { token } = await registerUser();
    const res = await request(app).get('/api/v1/tasks').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      total_pages: 0,
      has_next: false,
      has_prev: false,
    });
  });

  it('filters by status', async () => {
    const { token } = await registerUser();
    await createTask(token, { title: 'P1' });
    await createTask(token, { title: 'P2' });

    const created = await createTask(token, { title: 'Done' });
    await request(app)
      .post(`/api/v1/tasks/${created.body.id}/complete`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .get('/api/v1/tasks?status=completed')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Done');
  });

  it('filters by priority', async () => {
    const { token } = await registerUser();
    await createTask(token, { title: 'High', priority: 'high' });
    await createTask(token, { title: 'Low', priority: 'low' });

    const res = await request(app)
      .get('/api/v1/tasks?priority=high')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].priority).toBe('high');
  });

  it('searches title and description', async () => {
    const { token } = await registerUser();
    await createTask(token, { title: 'Buy milk' });
    await createTask(token, { title: 'Call', description: 'about milk' });
    await createTask(token, { title: 'Other' });

    const res = await request(app)
      .get('/api/v1/tasks?search=milk')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(2);
  });

  it('filters by due_before / due_after', async () => {
    const { token } = await registerUser();
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();

    await createTask(token, { title: 'Soon', due_date: tomorrow });
    await createTask(token, { title: 'Later', due_date: nextWeek });

    const res = await request(app)
      .get(`/api/v1/tasks?due_before=${nextWeek}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Soon');
  });

  it('paginates correctly', async () => {
    const { token } = await registerUser();
    for (let i = 0; i < 25; i++) {
      await createTask(token, { title: `Task ${i}` });
    }

    const page1 = await request(app)
      .get('/api/v1/tasks?page=1&limit=10')
      .set('Authorization', `Bearer ${token}`);

    expect(page1.body.data).toHaveLength(10);
    expect(page1.body.pagination.total).toBe(25);
    expect(page1.body.pagination.total_pages).toBe(3);
    expect(page1.body.pagination.has_next).toBe(true);
    expect(page1.body.pagination.has_prev).toBe(false);

    const page3 = await request(app)
      .get('/api/v1/tasks?page=3&limit=10')
      .set('Authorization', `Bearer ${token}`);

    expect(page3.body.data).toHaveLength(5);
    expect(page3.body.pagination.has_next).toBe(false);
    expect(page3.body.pagination.has_prev).toBe(true);
  });

  it('clamps limit to 100', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .get('/api/v1/tasks?limit=9999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.pagination.limit).toBe(100);
  });

  it('rejects invalid status filter (422)', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .get('/api/v1/tasks?status=bogus')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(422);
  });

  it('excludes soft-deleted tasks', async () => {
    const { token } = await registerUser();
    const created = await createTask(token, { title: 'Will be deleted' });
    await request(app)
      .delete(`/api/v1/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app).get('/api/v1/tasks').set('Authorization', `Bearer ${token}`);

    expect(res.body.data).toHaveLength(0);
  });

  it('sorts by created_at asc', async () => {
    const { token } = await registerUser();
    await createTask(token, { title: 'First' });
    await new Promise((r) => setTimeout(r, 10));
    await createTask(token, { title: 'Second' });

    const res = await request(app)
      .get('/api/v1/tasks?sort=created_at:asc')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.data[0].title).toBe('First');
    expect(res.body.data[1].title).toBe('Second');
  });
});

// ═══════════════════════════════════════════════════
// GET /api/v1/tasks/:id
// ═══════════════════════════════════════════════════
describe('GET /api/v1/tasks/:id', () => {
  it('returns the task for its owner', async () => {
    const { token } = await registerUser();
    const created = await createTask(token, { title: 'Mine' });

    const res = await request(app)
      .get(`/api/v1/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
  });

  it('returns 404 for non-existent id', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .get('/api/v1/tasks/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TASK_NOT_FOUND');
  });

  it("returns 404 when accessing another user's task (no leak)", async () => {
    const { token: tokenA } = await registerUser('a@example.com');
    const { token: tokenB } = await registerUser('b@example.com');
    const created = await createTask(tokenA, { title: 'A private task' });

    const res = await request(app)
      .get(`/api/v1/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TASK_NOT_FOUND');
  });

  it('returns 404 for soft-deleted task', async () => {
    const { token } = await registerUser();
    const created = await createTask(token);
    await request(app)
      .delete(`/api/v1/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .get(`/api/v1/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════
// PATCH /api/v1/tasks/:id
// ═══════════════════════════════════════════════════
describe('PATCH /api/v1/tasks/:id', () => {
  it('updates fields partially', async () => {
    const { token } = await registerUser();
    const created = await createTask(token, { title: 'Old', priority: 'low' });

    const res = await request(app)
      .patch(`/api/v1/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New', priority: 'high' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New');
    expect(res.body.priority).toBe('high');
  });

  it('setting status=completed sets completed_at', async () => {
    const { token } = await registerUser();
    const created = await createTask(token);

    const res = await request(app)
      .patch(`/api/v1/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' });

    expect(res.body.status).toBe('completed');
    expect(res.body.completedAt).toBeTruthy();
  });

  it('moving away from completed clears completed_at', async () => {
    const { token } = await registerUser();
    const created = await createTask(token);
    await request(app)
      .patch(`/api/v1/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'completed' });

    const res = await request(app)
      .patch(`/api/v1/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'pending' });

    expect(res.body.completedAt).toBeNull();
  });

  it('rejects attempt to modify source (422)', async () => {
    const { token } = await registerUser();
    const created = await createTask(token);

    const res = await request(app)
      .patch(`/api/v1/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ source: 'ai_nl' });

    expect(res.status).toBe(422);
  });

  it('rejects attempt to modify metadata (422)', async () => {
    const { token } = await registerUser();
    const created = await createTask(token);

    const res = await request(app)
      .patch(`/api/v1/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ metadata: { fake: true } });

    expect(res.status).toBe(422);
  });

  it("returns 404 for another user's task", async () => {
    const { token: tokenA } = await registerUser('a@example.com');
    const { token: tokenB } = await registerUser('b@example.com');
    const created = await createTask(tokenA);

    const res = await request(app)
      .patch(`/api/v1/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ title: 'Hacked' });

    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════
// DELETE /api/v1/tasks/:id (soft delete)
// ═══════════════════════════════════════════════════
describe('DELETE /api/v1/tasks/:id', () => {
  it('returns 204 on success', async () => {
    const { token } = await registerUser();
    const created = await createTask(token);

    const res = await request(app)
      .delete(`/api/v1/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
  });

  it('returns 404 on second delete (already soft-deleted)', async () => {
    const { token } = await registerUser();
    const created = await createTask(token);
    await request(app)
      .delete(`/api/v1/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .delete(`/api/v1/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("returns 404 for another user's task", async () => {
    const { token: tokenA } = await registerUser('a@example.com');
    const { token: tokenB } = await registerUser('b@example.com');
    const created = await createTask(tokenA);

    const res = await request(app)
      .delete(`/api/v1/tasks/${created.body.id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════
// POST /api/v1/tasks/:id/complete and /reopen
// ═══════════════════════════════════════════════════
describe('POST /api/v1/tasks/:id/complete', () => {
  it('marks the task completed and sets completed_at', async () => {
    const { token } = await registerUser();
    const created = await createTask(token);

    const res = await request(app)
      .post(`/api/v1/tasks/${created.body.id}/complete`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.completedAt).toBeTruthy();
  });

  it('is idempotent (second call keeps completed_at consistent)', async () => {
    const { token } = await registerUser();
    const created = await createTask(token);

    const first = await request(app)
      .post(`/api/v1/tasks/${created.body.id}/complete`)
      .set('Authorization', `Bearer ${token}`);

    const second = await request(app)
      .post(`/api/v1/tasks/${created.body.id}/complete`)
      .set('Authorization', `Bearer ${token}`);

    expect(second.status).toBe(200);
    expect(second.body.status).toBe('completed');
    expect(new Date(second.body.completedAt).getTime()).toBe(
      new Date(first.body.completedAt).getTime(),
    );
  });

  it("returns 404 for another user's task", async () => {
    const { token: tokenA } = await registerUser('a@example.com');
    const { token: tokenB } = await registerUser('b@example.com');
    const created = await createTask(tokenA);

    const res = await request(app)
      .post(`/api/v1/tasks/${created.body.id}/complete`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/tasks/:id/reopen', () => {
  it('reopens a completed task and clears completed_at', async () => {
    const { token } = await registerUser();
    const created = await createTask(token);
    await request(app)
      .post(`/api/v1/tasks/${created.body.id}/complete`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .post(`/api/v1/tasks/${created.body.id}/reopen`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
    expect(res.body.completedAt).toBeNull();
  });

  it('returns 404 for non-existent task', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .post('/api/v1/tasks/00000000-0000-0000-0000-000000000000/reopen')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
