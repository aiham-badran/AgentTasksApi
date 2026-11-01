// tests/integration/auth.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { resetDb } from '../helpers/db.js';
import { signToken } from '../../src/utils/jwt.js';

const app = createApp();

beforeEach(() => {
  resetDb();
});

// ═══════════════════════════════════════════════════
// POST /api/v1/auth/register
// ═══════════════════════════════════════════════════
describe('POST /api/v1/auth/register', () => {
  const validBody = {
    email: 'newuser@example.com',
    password: 'Password123',
    name: 'New User',
  };

  it('returns 201 with user + token for valid input', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validBody);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('user');
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(validBody.email);
    expect(res.body.user.name).toBe(validBody.name);
    expect(res.body.user.id).toBeDefined();
    expect(typeof res.body.token).toBe('string');
  });

  it('never exposes password fields in response', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validBody);

    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.password_hash).toBeUndefined();
    expect(res.body.user.password).toBeUndefined();
  });

  it('returns 409 AUTH_EMAIL_EXISTS on duplicate email', async () => {
    await request(app).post('/api/v1/auth/register').send(validBody);

    const res = await request(app).post('/api/v1/auth/register').send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('AUTH_EMAIL_EXISTS');
  });

  it('returns 422 on invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validBody, email: 'not-an-email' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.details).toHaveProperty('email');
  });

  it('returns 422 on short password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validBody, password: 'Ab1' });

    expect(res.status).toBe(422);
    expect(res.body.error.details).toHaveProperty('password');
  });

  it('returns 422 on password without uppercase', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validBody, password: 'password123' });

    expect(res.status).toBe(422);
  });

  it('returns 422 on password without digit', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validBody, password: 'PasswordABC' });

    expect(res.status).toBe(422);
  });

  it('returns 422 on missing fields', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({});

    expect(res.status).toBe(422);
    expect(res.body.error.details).toHaveProperty('email');
    expect(res.body.error.details).toHaveProperty('password');
    expect(res.body.error.details).toHaveProperty('name');
  });

  it('returns 422 on name too short', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validBody, name: 'A' });

    expect(res.status).toBe(422);
  });
});

// ═══════════════════════════════════════════════════
// POST /api/v1/auth/login
// ═══════════════════════════════════════════════════
describe('POST /api/v1/auth/login', () => {
  const creds = {
    email: 'login@example.com',
    password: 'Password123',
    name: 'Login User',
  };

  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register').send(creds);
  });

  it('returns 200 with user + token for correct credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: creds.email, password: creds.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(creds.email);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('returns 401 AUTH_INVALID on wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: creds.email, password: 'WrongPassword123' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID');
  });

  it('returns 401 AUTH_INVALID on non-existent email (same as wrong password)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ghost@example.com', password: 'Password123' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID');
    // ⚠️ نفس الكود — لا نكشف وجود البريد
  });

  it('returns 422 on invalid input', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' });

    expect(res.status).toBe(422);
  });
});

// ═══════════════════════════════════════════════════
// GET /api/v1/auth/me
// ═══════════════════════════════════════════════════
describe('GET /api/v1/auth/me', () => {
  async function registerAndGetToken() {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'me@example.com',
      password: 'Password123',
      name: 'Me User',
    });
    return { token: res.body.token, user: res.body.user };
  }

  it('returns 200 with user data for valid token', async () => {
    const { token, user } = await registerAndGetToken();

    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(user.id);
    expect(res.body.email).toBe(user.email);
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('returns 401 AUTH_REQUIRED when no token', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('returns 401 AUTH_INVALID on malformed token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID');
  });

  it('returns 401 AUTH_INVALID on expired token', async () => {
    const expired = signToken({ sub: 'x', email: 'x@x.com' }, { expiresIn: '1ms' });
    await new Promise((r) => setTimeout(r, 50));

    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${expired}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID');
  });

  it('returns 401 AUTH_INVALID on token for non-existent user', async () => {
    const ghostToken = signToken({
      sub: 'non-existent-id',
      email: 'ghost@example.com',
    });

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${ghostToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID');
  });
});
