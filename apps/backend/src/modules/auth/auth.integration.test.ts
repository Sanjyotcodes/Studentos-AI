// Phase 5 (T5.1–T5.13): exercises the real auth module end-to-end — real
// createApp(), real routes, real Prisma singleton — against a reachable
// Postgres (see docker-compose.yml). Every test uses a unique email so tests
// can run in any order without colliding.
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';

const app = createApp();
const PASSWORD = 'correct-horse-battery-staple';

function uniqueEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@studentos-test.dev`;
}

async function registerUser(prefix: string) {
  const email = uniqueEmail(prefix);
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password: PASSWORD });
  return { email, res };
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/auth/register', () => {
  it('T5.1: a valid payload returns 201 with the user and tokens, no password field anywhere', async () => {
    const { email, res } = await registerUser('register-ok');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({ email, name: 'Test User' });
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(typeof res.body.data.refreshToken).toBe('string');

    const bodyText = JSON.stringify(res.body).toLowerCase();
    expect(bodyText).not.toContain('password');
    expect(bodyText).not.toContain(PASSWORD.toLowerCase());
  });

  it('T5.2: registering an already-used email returns 409 EMAIL_IN_USE', async () => {
    const email = uniqueEmail('dup');
    const payload = { name: 'Dup User', email, password: PASSWORD };

    const first = await request(app).post('/api/auth/register').send(payload);
    expect(first.status).toBe(201);

    const second = await request(app).post('/api/auth/register').send(payload);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('EMAIL_IN_USE');
  });

  it('T5.3: a weak password returns 400 before any database write', async () => {
    const email = uniqueEmail('weak');
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Weak', email, password: 'short' });

    expect(res.status).toBe(400);

    const stored = await prisma.user.findUnique({ where: { email } });
    expect(stored).toBeNull();
    expect(JSON.stringify(res.body)).not.toContain('short');
  });
});

describe('POST /api/auth/login', () => {
  it('T5.4: correct credentials return 200 with tokens', async () => {
    const { email } = await registerUser('login-ok');

    const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(typeof res.body.data.refreshToken).toBe('string');
  });

  it('T5.5: wrong password and unknown email produce an identical 401 response', async () => {
    const { email } = await registerUser('login-wrongpw');

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'not-the-right-password' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: uniqueEmail('nonexistent'), password: 'whatever-password' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it('T5.6: the stored password hash is not the plaintext and carries a bcrypt prefix', async () => {
    const { email } = await registerUser('hash-check');

    const stored = await prisma.user.findUnique({ where: { email } });
    expect(stored).not.toBeNull();
    expect(stored?.passwordHash).not.toBe(PASSWORD);
    expect(stored?.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/);
  });
});

describe('auth.middleware (protected routes)', () => {
  it('T5.7: no token returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('T5.8: a malformed token and a wrong-signature token both return 401', async () => {
    const wrongSignature = jwt.sign({ sub: randomUUID() }, 'a-completely-different-secret', {
      expiresIn: '15m',
    });

    const malformedRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-jwt');
    const wrongSigRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${wrongSignature}`);

    expect(malformedRes.status).toBe(401);
    expect(wrongSigRes.status).toBe(401);
  });

  it('T5.9: an expired access token returns 401', async () => {
    const { res: registerRes } = await registerUser('expired');
    const userId = registerRes.body.data.user.id as string;

    const expiredToken = jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, { expiresIn: -10 });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('T5.10: a valid refresh token issues a new pair and rejects the old one', async () => {
    const { res: registerRes } = await registerUser('refresh-ok');
    const oldRefreshToken = registerRes.body.data.refreshToken as string;

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: oldRefreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.refreshToken).not.toBe(oldRefreshToken);
    expect(typeof refreshRes.body.data.accessToken).toBe('string');

    const reuseRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: oldRefreshToken });
    expect(reuseRes.status).toBe(401);
  });

  it('T5.11: presenting an access token as the refresh token returns 401', async () => {
    const { res: registerRes } = await registerUser('refresh-wrongtype');
    const accessToken = registerRes.body.data.accessToken as string;

    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: accessToken });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('T5.12: after logout, the refresh token no longer works', async () => {
    const { res: registerRes } = await registerUser('logout');
    const refreshToken = registerRes.body.data.refreshToken as string;

    const logoutRes = await request(app).post('/api/auth/logout').send({ refreshToken });
    expect(logoutRes.status).toBe(204);

    const afterLogout = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(afterLogout.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('T5.13: returns only the authenticated user', async () => {
    const { email, res: registerRes } = await registerUser('me');
    const { accessToken, user } = registerRes.body.data;

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(user);
    expect(res.body.data.email).toBe(email);
  });
});
