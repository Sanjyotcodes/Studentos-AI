// Phase 14 (T14.1, T14.2, T14.3, T14.4, T14.5 end-to-end): exercises the real
// grades module end-to-end — real createApp(), real routes, real Prisma.
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

async function createMark(
  accessToken: string,
  overrides: Partial<{
    subjectId: string;
    assessmentType: string;
    label: string;
    scored: number;
    max: number;
    weight: number;
  }> = {},
) {
  const subjectId = overrides.subjectId ?? (await createSubject(accessToken));
  return request(app)
    .post('/api/grades')
    .set(authHeader(accessToken))
    .send({
      subjectId,
      assessmentType: overrides.assessmentType ?? 'QUIZ',
      scored: overrides.scored ?? 8,
      max: overrides.max ?? 10,
      weight: overrides.weight ?? 20,
      ...(overrides.label ? { label: overrides.label } : {}),
    });
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe('T14.1: mark CRUD works and is user-scoped', () => {
  it('creates, lists, updates, and deletes a mark for its own owner', async () => {
    const { accessToken } = await registerAndLogin('crud');
    const subjectId = await createSubject(accessToken);

    const createRes = await createMark(accessToken, { subjectId, scored: 7, max: 10, weight: 25 });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.scored).toBe(7);
    const markId = createRes.body.data.id as string;

    const listRes = await request(app).get('/api/grades').set(authHeader(accessToken));
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((m: { id: string }) => m.id === markId)).toBe(true);

    const updateRes = await request(app)
      .patch(`/api/grades/${markId}`)
      .set(authHeader(accessToken))
      .send({ scored: 9 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.scored).toBe(9);

    const deleteRes = await request(app).delete(`/api/grades/${markId}`).set(authHeader(accessToken));
    expect(deleteRes.status).toBe(204);

    const listAfterDelete = await request(app).get('/api/grades').set(authHeader(accessToken));
    expect(listAfterDelete.body.data.some((m: { id: string }) => m.id === markId)).toBe(false);
  });

  it('cross-user access to update/delete returns 404', async () => {
    const userA = await registerAndLogin('cross-a');
    const userB = await registerAndLogin('cross-b');
    const createRes = await createMark(userA.accessToken);
    const markId = createRes.body.data.id as string;

    const updateRes = await request(app)
      .patch(`/api/grades/${markId}`)
      .set(authHeader(userB.accessToken))
      .send({ scored: 1 });
    const deleteRes = await request(app)
      .delete(`/api/grades/${markId}`)
      .set(authHeader(userB.accessToken));

    expect(updateRes.status).toBe(404);
    expect(deleteRes.status).toBe(404);

    const listB = await request(app).get('/api/grades').set(authHeader(userB.accessToken));
    expect(listB.body.data.some((m: { id: string }) => m.id === markId)).toBe(false);
  });

  it('creating a mark against another user\'s subjectId returns 404', async () => {
    const userA = await registerAndLogin('foreign-subj-a');
    const userB = await registerAndLogin('foreign-subj-b');
    const subjectIdOwnedByA = await createSubject(userA.accessToken);

    const res = await createMark(userB.accessToken, { subjectId: subjectIdOwnedByA });
    expect(res.status).toBe(404);
  });

  it('deleting a subject removes its marks (no orphaned FK)', async () => {
    const { accessToken } = await registerAndLogin('subject-delete');
    const subjectId = await createSubject(accessToken);
    const markRes = await createMark(accessToken, { subjectId });
    const markId = markRes.body.data.id as string;

    const deleteSubjectRes = await request(app)
      .delete(`/api/subjects/${subjectId}`)
      .set(authHeader(accessToken));
    expect(deleteSubjectRes.status).toBe(204);

    const dbMark = await prisma.mark.findUnique({ where: { id: markId } });
    expect(dbMark).toBeNull();
  });

  it('every grades endpoint returns 401 without a token', async () => {
    const listRes = await request(app).get('/api/grades');
    const createRes = await request(app)
      .post('/api/grades')
      .send({ subjectId: randomUUID(), assessmentType: 'QUIZ', scored: 5, max: 10, weight: 20 });
    const updateRes = await request(app).patch(`/api/grades/${randomUUID()}`).send({ scored: 1 });
    const deleteRes = await request(app).delete(`/api/grades/${randomUUID()}`);
    const summaryRes = await request(app).get('/api/grades/summary');

    expect(listRes.status).toBe(401);
    expect(createRes.status).toBe(401);
    expect(updateRes.status).toBe(401);
    expect(deleteRes.status).toBe(401);
    expect(summaryRes.status).toBe(401);
  });
});

describe('T14.2: scored > max -> 400; negative values -> 400', () => {
  it('scored greater than max on create returns 400 and persists nothing', async () => {
    const { accessToken } = await registerAndLogin('scored-exceeds-max');
    const before = await prisma.mark.count();
    const res = await createMark(accessToken, { scored: 15, max: 10 });
    expect(res.status).toBe(400);
    const after = await prisma.mark.count();
    expect(after).toBe(before);
  });

  it('a negative scored value returns 400', async () => {
    const { accessToken } = await registerAndLogin('negative-scored');
    const res = await createMark(accessToken, { scored: -1, max: 10 });
    expect(res.status).toBe(400);
  });

  it('a zero or negative max returns 400', async () => {
    const { accessToken } = await registerAndLogin('non-positive-max');
    const res = await createMark(accessToken, { scored: 0, max: 0 });
    expect(res.status).toBe(400);
  });

  it('a non-positive weight returns 400', async () => {
    const { accessToken } = await registerAndLogin('non-positive-weight');
    const res = await createMark(accessToken, { weight: 0 });
    expect(res.status).toBe(400);
  });

  it('an update that pushes scored above the existing max returns 400 and changes nothing', async () => {
    const { accessToken } = await registerAndLogin('update-exceeds-max');
    const createRes = await createMark(accessToken, { scored: 5, max: 10 });
    const markId = createRes.body.data.id as string;

    const updateRes = await request(app)
      .patch(`/api/grades/${markId}`)
      .set(authHeader(accessToken))
      .send({ scored: 11 });
    expect(updateRes.status).toBe(400);

    const dbMark = await prisma.mark.findUnique({ where: { id: markId } });
    expect(dbMark?.scored).toBe(5);
  });

  it('an update that lowers max below the existing scored returns 400 and changes nothing', async () => {
    const { accessToken } = await registerAndLogin('update-max-below-scored');
    const createRes = await createMark(accessToken, { scored: 8, max: 10 });
    const markId = createRes.body.data.id as string;

    const updateRes = await request(app)
      .patch(`/api/grades/${markId}`)
      .set(authHeader(accessToken))
      .send({ max: 5 });
    expect(updateRes.status).toBe(400);

    const dbMark = await prisma.mark.findUnique({ where: { id: markId } });
    expect(dbMark?.max).toBe(10);
  });
});

describe('T14.3/T14.4/T14.5 end-to-end: GET /api/grades/summary', () => {
  it('matches a hand-computed fixture, and GPA is 0 (not NaN) with no marks at all', async () => {
    const { accessToken } = await registerAndLogin('summary-fixture');

    // Subject with no marks yet -> null percentage/gradePoint, excluded from GPA.
    await createSubject(accessToken, 'Untouched Subject');

    // Subject with a fixture: weights sum to 100.
    const gradedSubject = await createSubject(accessToken, 'Thermodynamics');
    await createMark(accessToken, { subjectId: gradedSubject, assessmentType: 'QUIZ', scored: 8, max: 10, weight: 20 });
    await createMark(accessToken, { subjectId: gradedSubject, assessmentType: 'MIDTERM', scored: 27, max: 30, weight: 30 });
    await createMark(accessToken, { subjectId: gradedSubject, assessmentType: 'FINAL', scored: 45, max: 60, weight: 50 });

    const res = await request(app).get('/api/grades/summary').set(authHeader(accessToken));
    expect(res.status).toBe(200);

    const untouched = res.body.data.subjects.find((s: { subjectName: string }) => s.subjectName === 'Untouched Subject');
    expect(untouched.weightedPercentage).toBeNull();
    expect(untouched.gradePoint).toBeNull();

    const graded = res.body.data.subjects.find((s: { subjectName: string }) => s.subjectName === 'Thermodynamics');
    expect(graded.weightedPercentage).toBe(80.5);
    expect(graded.gradePoint).toBe(9); // 80.5 falls in the [80,90) band -> 9

    // GPA is the mean grade point across subjects that HAVE marks (only one here).
    expect(res.body.data.gpa).toBe(9);
  });

  it('GPA is 0, not NaN, for a brand-new account with zero subjects and zero marks', async () => {
    const { accessToken } = await registerAndLogin('summary-empty');
    const res = await request(app).get('/api/grades/summary').set(authHeader(accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.subjects).toEqual([]);
    expect(res.body.data.gpa).toBe(0);
  });

  it('T14.5: weights not summing to 100 are normalized, not rejected', async () => {
    const { accessToken } = await registerAndLogin('summary-weights-not-100');
    const subjectId = await createSubject(accessToken, 'Statistics');
    // Weights sum to 60 -> normalized: (0.5*20 + 0.8*40)/60*100 = 70
    await createMark(accessToken, { subjectId, scored: 5, max: 10, weight: 20 });
    await createMark(accessToken, { subjectId, scored: 8, max: 10, weight: 40 });

    const res = await request(app).get('/api/grades/summary').set(authHeader(accessToken));
    expect(res.status).toBe(200);
    const subject = res.body.data.subjects.find((s: { subjectId: string }) => s.subjectId === subjectId);
    expect(subject.weightedPercentage).toBe(70);
    expect(subject.totalWeightRecorded).toBe(60);
  });

  it('the summary never includes another user\'s subjects or marks', async () => {
    const userA = await registerAndLogin('summary-scope-a');
    const userB = await registerAndLogin('summary-scope-b');
    const subjectA = await createSubject(userA.accessToken, 'Only User A Subject');
    await createMark(userA.accessToken, { subjectId: subjectA });
    const subjectB = await createSubject(userB.accessToken, 'Only User B Subject');
    await createMark(userB.accessToken, { subjectId: subjectB });

    const res = await request(app).get('/api/grades/summary').set(authHeader(userA.accessToken));
    const subjectNames = res.body.data.subjects.map((s: { subjectName: string }) => s.subjectName);
    expect(subjectNames).toContain('Only User A Subject');
    expect(subjectNames).not.toContain('Only User B Subject');
  });
});
