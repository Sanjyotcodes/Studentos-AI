// Phase 13 (T13.3 + supporting CRUD): exercises the real exam-dates module
// end-to-end — real createApp(), real routes, real Prisma.
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

async function createSubject(accessToken: string, name = 'Data Structures'): Promise<string> {
  const res = await request(app)
    .post('/api/subjects')
    .set(authHeader(accessToken))
    .send({ name, code: uniqueCode('SUBJ') });
  return res.body.data.id as string;
}

function daysFromToday(offset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Exam dates: CRUD works and is user-scoped', () => {
  it('creates (upserts), lists, and deletes an exam date for its own owner', async () => {
    const { accessToken } = await registerAndLogin('examdate-crud');
    const subjectId = await createSubject(accessToken);

    const createRes = await request(app)
      .post('/api/exam-dates')
      .set(authHeader(accessToken))
      .send({ subjectId, date: daysFromToday(10) });
    expect(createRes.status).toBe(200);
    expect(createRes.body.data.subjectId).toBe(subjectId);
    const examDateId = createRes.body.data.id as string;

    const listRes = await request(app).get('/api/exam-dates').set(authHeader(accessToken));
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((e: { id: string }) => e.id === examDateId)).toBe(true);

    const deleteRes = await request(app)
      .delete(`/api/exam-dates/${examDateId}`)
      .set(authHeader(accessToken));
    expect(deleteRes.status).toBe(204);

    const listAfterDelete = await request(app).get('/api/exam-dates').set(authHeader(accessToken));
    expect(listAfterDelete.body.data.some((e: { id: string }) => e.id === examDateId)).toBe(false);
  });

  it('setting a new date for a subject that already has one updates it (no duplicate)', async () => {
    const { accessToken } = await registerAndLogin('examdate-upsert');
    const subjectId = await createSubject(accessToken);

    await request(app)
      .post('/api/exam-dates')
      .set(authHeader(accessToken))
      .send({ subjectId, date: daysFromToday(5) });
    const secondRes = await request(app)
      .post('/api/exam-dates')
      .set(authHeader(accessToken))
      .send({ subjectId, date: daysFromToday(20) });

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.data.date).toBe(daysFromToday(20));

    const count = await prisma.examDate.count({ where: { subjectId } });
    expect(count).toBe(1);
  });

  it('cross-user access to delete returns 404', async () => {
    const userA = await registerAndLogin('examdate-cross-a');
    const userB = await registerAndLogin('examdate-cross-b');
    const subjectId = await createSubject(userA.accessToken);
    const createRes = await request(app)
      .post('/api/exam-dates')
      .set(authHeader(userA.accessToken))
      .send({ subjectId, date: daysFromToday(7) });
    const examDateId = createRes.body.data.id as string;

    const deleteRes = await request(app)
      .delete(`/api/exam-dates/${examDateId}`)
      .set(authHeader(userB.accessToken));
    expect(deleteRes.status).toBe(404);
  });

  it('creating an exam date against another user\'s subjectId returns 404', async () => {
    const userA = await registerAndLogin('examdate-foreign-a');
    const userB = await registerAndLogin('examdate-foreign-b');
    const subjectIdOwnedByA = await createSubject(userA.accessToken);

    const res = await request(app)
      .post('/api/exam-dates')
      .set(authHeader(userB.accessToken))
      .send({ subjectId: subjectIdOwnedByA, date: daysFromToday(7) });
    expect(res.status).toBe(404);
  });

  it('every exam-date endpoint returns 401 without a token', async () => {
    const listRes = await request(app).get('/api/exam-dates');
    const createRes = await request(app)
      .post('/api/exam-dates')
      .send({ subjectId: randomUUID(), date: daysFromToday(7) });
    const deleteRes = await request(app).delete(`/api/exam-dates/${randomUUID()}`);

    expect(listRes.status).toBe(401);
    expect(createRes.status).toBe(401);
    expect(deleteRes.status).toBe(401);
  });
});

describe('T13.3: exam date in the past returns 400', () => {
  it('rejects a date before today and persists nothing', async () => {
    const { accessToken } = await registerAndLogin('examdate-past');
    const subjectId = await createSubject(accessToken);
    const before = await prisma.examDate.count();

    const res = await request(app)
      .post('/api/exam-dates')
      .set(authHeader(accessToken))
      .send({ subjectId, date: daysFromToday(-1) });
    expect(res.status).toBe(400);

    const after = await prisma.examDate.count();
    expect(after).toBe(before);
  });

  it('accepts today\'s date (not "in the past")', async () => {
    const { accessToken } = await registerAndLogin('examdate-today');
    const subjectId = await createSubject(accessToken);

    const res = await request(app)
      .post('/api/exam-dates')
      .set(authHeader(accessToken))
      .send({ subjectId, date: daysFromToday(0) });
    expect(res.status).toBe(200);
  });
});
