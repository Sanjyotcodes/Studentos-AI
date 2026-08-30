// Phase 6 (T6.1, T6.2, T6.16, T6.18 for subjects): exercises the real
// subjects module end-to-end — real createApp(), real routes, real Prisma —
// against a reachable Postgres (see docker-compose.yml).
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app';
import { prisma } from '../../lib/prisma';

const app = createApp();

async function registerAndLogin(prefix: string) {
  const email = `${prefix}-${randomUUID()}@studentos-test.dev`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password: 'correct-horse-battery' });
  return { accessToken: res.body.data.accessToken as string };
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function uniqueCode(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/subjects', () => {
  it('T6.1: create subject -> 201; appears in that user\'s list', async () => {
    const { accessToken } = await registerAndLogin('subj-create');

    const createRes = await request(app)
      .post('/api/subjects')
      .set(authHeader(accessToken))
      .send({ name: 'Data Structures', code: uniqueCode('DSA') });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.name).toBe('Data Structures');

    const listRes = await request(app).get('/api/subjects').set(authHeader(accessToken));
    expect(listRes.status).toBe(200);
    expect(
      listRes.body.data.some((subject: { id: string }) => subject.id === createRes.body.data.id),
    ).toBe(true);
  });
});

describe('Cross-user ownership (T6.2)', () => {
  it('User A cannot read, update, or delete User B\'s subject', async () => {
    const userA = await registerAndLogin('subj-a');
    const userB = await registerAndLogin('subj-b');

    const createRes = await request(app)
      .post('/api/subjects')
      .set(authHeader(userA.accessToken))
      .send({ name: 'Private Subject', code: uniqueCode('PRIV') });
    const subjectId = createRes.body.data.id as string;

    const updateRes = await request(app)
      .patch(`/api/subjects/${subjectId}`)
      .set(authHeader(userB.accessToken))
      .send({ name: 'Hijacked' });
    expect(updateRes.status).toBe(404);

    const deleteRes = await request(app)
      .delete(`/api/subjects/${subjectId}`)
      .set(authHeader(userB.accessToken));
    expect(deleteRes.status).toBe(404);

    // No single-resource GET exists for subjects (list-only per the
    // deliverable), so "cannot read" is proven by absence from B's own list.
    const listRes = await request(app).get('/api/subjects').set(authHeader(userB.accessToken));
    expect(listRes.body.data.some((subject: { id: string }) => subject.id === subjectId)).toBe(
      false,
    );

    // Confirm A's subject is untouched by B's attempted update.
    const stillOwnedByA = await prisma.subject.findUnique({ where: { id: subjectId } });
    expect(stillOwnedByA?.name).toBe('Private Subject');
  });
});

describe('DELETE /api/subjects/:id (T6.16)', () => {
  it('deleting a subject removes its attendance records', async () => {
    const { accessToken } = await registerAndLogin('subj-cascade');

    const createRes = await request(app)
      .post('/api/subjects')
      .set(authHeader(accessToken))
      .send({ name: 'Cascade Subject', code: uniqueCode('CAS') });
    const subjectId = createRes.body.data.id as string;

    const markRes = await request(app)
      .post('/api/attendance')
      .set(authHeader(accessToken))
      .send({ subjectId, date: '2026-01-10', status: 'PRESENT' });
    const attendanceId = markRes.body.data.id as string;

    await request(app)
      .delete(`/api/subjects/${subjectId}`)
      .set(authHeader(accessToken))
      .expect(204);

    const storedRecord = await prisma.attendanceRecord.findUnique({
      where: { id: attendanceId },
    });
    expect(storedRecord).toBeNull();

    const storedSubject = await prisma.subject.findUnique({ where: { id: subjectId } });
    expect(storedSubject).toBeNull();
  });
});

describe('Auth required (T6.18, subjects)', () => {
  it('every subjects endpoint returns 401 without a token', async () => {
    const listRes = await request(app).get('/api/subjects');
    const createRes = await request(app)
      .post('/api/subjects')
      .send({ name: 'X', code: uniqueCode('X') });
    const updateRes = await request(app)
      .patch(`/api/subjects/${randomUUID()}`)
      .send({ name: 'X' });
    const deleteRes = await request(app).delete(`/api/subjects/${randomUUID()}`);

    expect(listRes.status).toBe(401);
    expect(createRes.status).toBe(401);
    expect(updateRes.status).toBe(401);
    expect(deleteRes.status).toBe(401);
  });
});
