// Phase 13 (T13.1, T13.2, T13.4, T13.5): exercises the real planner module
// end-to-end — real createApp(), real routes, real Prisma/attendance data —
// with the Gemini SDK mocked, same approach as ai.integration.test.ts.
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { generateContentMock } = vi.hoisted(() => ({ generateContentMock: vi.fn() }));

vi.mock('@google/genai', () => {
  class ApiError extends Error {
    status: number;
    constructor(options: { message: string; status: number }) {
      super(options.message);
      this.status = options.status;
    }
  }

  class GoogleGenAI {
    models = { generateContent: generateContentMock };
  }

  return { GoogleGenAI, ApiError };
});

// Imports after the mock is registered so ai.service.ts picks up the mocked SDK.
const { createApp } = await import('../../app');
const { prisma } = await import('../../lib/prisma');
const { ApiError } = await import('@google/genai');
const plannerService = await import('./planner.service');

const app = createApp();

function jsonResponse(payload: unknown) {
  return { text: JSON.stringify(payload), candidates: [{ finishReason: 'STOP' }] };
}

function refusalResponse() {
  return { text: undefined, candidates: undefined, promptFeedback: { blockReason: 'SAFETY' } };
}

async function registerAndLogin(prefix: string) {
  const email = `${prefix}-${randomUUID()}@studentos-test.dev`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password: 'correct-horse-battery' });
  return { userId: res.body.data.user.id as string, accessToken: res.body.data.accessToken as string };
}

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function uniqueCode(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

async function createSubject(accessToken: string, name: string): Promise<string> {
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

async function setExamDate(accessToken: string, subjectId: string, offsetDays: number) {
  await request(app)
    .post('/api/exam-dates')
    .set(authHeader(accessToken))
    .send({ subjectId, date: daysFromToday(offsetDays) });
}

async function createTask(accessToken: string, title: string, subjectId?: string) {
  await request(app)
    .post('/api/tasks')
    .set(authHeader(accessToken))
    .send({ title, ...(subjectId ? { subjectId } : {}) });
}

beforeEach(() => {
  generateContentMock.mockReset();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('T13.1: the planner input builder uses only the requesting user\'s data', () => {
  it('never includes another user\'s subject or task names', async () => {
    const userA = await registerAndLogin('planner-input-a');
    const userB = await registerAndLogin('planner-input-b');

    const subjectA = await createSubject(userA.accessToken, 'Only User A Subject');
    await setExamDate(userA.accessToken, subjectA, 10);
    await createTask(userA.accessToken, 'User A private task', subjectA);

    const subjectB = await createSubject(userB.accessToken, 'Only User B Subject');
    await setExamDate(userB.accessToken, subjectB, 10);
    await createTask(userB.accessToken, 'User B private task', subjectB);

    const input = await plannerService.buildPlannerInput(userA.userId);

    expect(input.subjectsWithExams.map((s) => s.name)).toContain('Only User A Subject');
    expect(input.subjectsWithExams.map((s) => s.name)).not.toContain('Only User B Subject');
    expect(input.openTasks.map((t) => t.title)).toContain('User A private task');
    expect(input.openTasks.map((t) => t.title)).not.toContain('User B private task');
  });
});

describe('T13.2: plan generation with no subjects / no exam dates returns a clear validation error', () => {
  it('a brand-new account with no subjects returns 400', async () => {
    const { accessToken } = await registerAndLogin('planner-no-subjects');
    const res = await request(app)
      .post('/api/study-plan/generate')
      .set(authHeader(accessToken))
      .send();
    expect(res.status).toBe(400);
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it('an account with a subject but no exam dates returns 400', async () => {
    const { accessToken } = await registerAndLogin('planner-no-exams');
    await createSubject(accessToken, 'Thermodynamics');
    const res = await request(app)
      .post('/api/study-plan/generate')
      .set(authHeader(accessToken))
      .send();
    expect(res.status).toBe(400);
    expect(generateContentMock).not.toHaveBeenCalled();
  });
});

describe('T13.4: a malformed AI response is rejected by schema validation rather than surfaced raw', () => {
  it('non-JSON text is rejected with a graceful error and nothing persisted', async () => {
    const { accessToken } = await registerAndLogin('planner-malformed-json');
    const subjectId = await createSubject(accessToken, 'Chemistry');
    await setExamDate(accessToken, subjectId, 10);
    generateContentMock.mockResolvedValueOnce({
      text: 'this is not json {',
      candidates: [{ finishReason: 'STOP' }],
    });

    const before = await prisma.studyPlan.count();
    const res = await request(app)
      .post('/api/study-plan/generate')
      .set(authHeader(accessToken))
      .send();

    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).not.toContain('this is not json');
    const after = await prisma.studyPlan.count();
    expect(after).toBe(before);
  });

  it('JSON missing the required "entries" field is rejected and nothing persisted', async () => {
    const { accessToken } = await registerAndLogin('planner-missing-entries');
    const subjectId = await createSubject(accessToken, 'Physics');
    await setExamDate(accessToken, subjectId, 10);
    generateContentMock.mockResolvedValueOnce(jsonResponse({ notEntries: [] }));

    const before = await prisma.studyPlan.count();
    const res = await request(app)
      .post('/api/study-plan/generate')
      .set(authHeader(accessToken))
      .send();

    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(res.body.success).toBe(false);
    const after = await prisma.studyPlan.count();
    expect(after).toBe(before);
  });

  it('an entry with an invalid date shape is rejected and nothing persisted', async () => {
    const { userId, accessToken } = await registerAndLogin('planner-bad-date');
    const subjectId = await createSubject(accessToken, 'Biology');
    await setExamDate(accessToken, subjectId, 10);
    generateContentMock.mockResolvedValueOnce(
      jsonResponse({
        entries: [{ date: 'not-a-date', subjectId, subjectName: 'Biology', activity: 'Review' }],
      }),
    );

    const res = await request(app)
      .post('/api/study-plan/generate')
      .set(authHeader(accessToken))
      .send();
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(res.body.success).toBe(false);
    expect(await prisma.studyPlan.count({ where: { userId } })).toBe(0);
  });

  it('an entry referencing a subjectId that was never sent is rejected and nothing persisted', async () => {
    const { accessToken } = await registerAndLogin('planner-hallucinated-subject');
    const subjectId = await createSubject(accessToken, 'Mathematics');
    await setExamDate(accessToken, subjectId, 10);
    const before = await prisma.studyPlan.count();
    generateContentMock.mockResolvedValueOnce(
      jsonResponse({
        entries: [
          {
            date: daysFromToday(1),
            subjectId: randomUUID(),
            subjectName: 'Invented Subject',
            activity: 'Review',
          },
        ],
      }),
    );

    const res = await request(app)
      .post('/api/study-plan/generate')
      .set(authHeader(accessToken))
      .send();
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(res.body.success).toBe(false);
    const after = await prisma.studyPlan.count();
    expect(after).toBe(before);
  });

  it('an entry dated outside the requested day range is rejected and nothing persisted', async () => {
    const { accessToken } = await registerAndLogin('planner-out-of-range');
    const subjectId = await createSubject(accessToken, 'Statistics');
    await setExamDate(accessToken, subjectId, 5);
    const before = await prisma.studyPlan.count();
    generateContentMock.mockResolvedValueOnce(
      jsonResponse({
        entries: [
          { date: daysFromToday(30), subjectId, subjectName: 'Statistics', activity: 'Review way later' },
        ],
      }),
    );

    const res = await request(app)
      .post('/api/study-plan/generate')
      .set(authHeader(accessToken))
      .send();
    expect(res.status).toBeGreaterThanOrEqual(500);
    const after = await prisma.studyPlan.count();
    expect(after).toBe(before);
  });

  it('T13.6 support: a plan that omits one of two exam subjects is rejected and nothing persisted', async () => {
    const { accessToken } = await registerAndLogin('planner-incomplete-coverage');
    const subjectA = await createSubject(accessToken, 'Algorithms');
    const subjectB = await createSubject(accessToken, 'Operating Systems');
    await setExamDate(accessToken, subjectA, 5);
    await setExamDate(accessToken, subjectB, 8);
    const before = await prisma.studyPlan.count();
    // Only covers subjectA — subjectB has an exam too but never appears.
    generateContentMock.mockResolvedValueOnce(
      jsonResponse({
        entries: [{ date: daysFromToday(1), subjectId: subjectA, subjectName: 'Algorithms', activity: 'Review' }],
      }),
    );

    const res = await request(app)
      .post('/api/study-plan/generate')
      .set(authHeader(accessToken))
      .send();
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(res.body.success).toBe(false);
    const after = await prisma.studyPlan.count();
    expect(after).toBe(before);
  });
});

describe('T13.5: AI failure returns a graceful error and does not persist a partial plan', () => {
  it('an upstream Gemini ApiError becomes a graceful error, nothing persisted', async () => {
    const { accessToken } = await registerAndLogin('planner-upstream-error');
    const subjectId = await createSubject(accessToken, 'Economics');
    await setExamDate(accessToken, subjectId, 10);
    const before = await prisma.studyPlan.count();
    generateContentMock.mockRejectedValueOnce(new ApiError({ message: 'upstream exploded', status: 500 }));

    const res = await request(app)
      .post('/api/study-plan/generate')
      .set(authHeader(accessToken))
      .send();
    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).not.toMatch(/upstream exploded/);
    const after = await prisma.studyPlan.count();
    expect(after).toBe(before);
  });

  it('a refusal is treated as a failure — graceful error, nothing persisted', async () => {
    const { accessToken } = await registerAndLogin('planner-refused');
    const subjectId = await createSubject(accessToken, 'Philosophy');
    await setExamDate(accessToken, subjectId, 10);
    const before = await prisma.studyPlan.count();
    generateContentMock.mockResolvedValueOnce(refusalResponse());

    const res = await request(app)
      .post('/api/study-plan/generate')
      .set(authHeader(accessToken))
      .send();
    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
    const after = await prisma.studyPlan.count();
    expect(after).toBe(before);
  });
});

describe('A valid AI response is persisted, and regenerating replaces rather than duplicates', () => {
  it('generates successfully, then regenerating overwrites the same row (count stays 1)', async () => {
    const { accessToken } = await registerAndLogin('planner-happy-path');
    const subjectId = await createSubject(accessToken, 'Databases');
    await setExamDate(accessToken, subjectId, 10);

    generateContentMock.mockResolvedValueOnce(
      jsonResponse({
        entries: [
          { date: daysFromToday(1), subjectId, subjectName: 'Databases', activity: 'Review indexing' },
          { date: daysFromToday(2), subjectId, subjectName: 'Databases', activity: 'Practice queries' },
        ],
      }),
    );
    const firstRes = await request(app)
      .post('/api/study-plan/generate')
      .set(authHeader(accessToken))
      .send();
    expect(firstRes.status).toBe(200);
    expect(firstRes.body.data.entries).toHaveLength(2);

    const getRes = await request(app).get('/api/study-plan').set(authHeader(accessToken));
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.entries).toHaveLength(2);

    generateContentMock.mockResolvedValueOnce(
      jsonResponse({
        entries: [{ date: daysFromToday(1), subjectId, subjectName: 'Databases', activity: 'Fresh plan' }],
      }),
    );
    const secondRes = await request(app)
      .post('/api/study-plan/generate')
      .set(authHeader(accessToken))
      .send();
    expect(secondRes.status).toBe(200);
    expect(secondRes.body.data.entries).toHaveLength(1);
    // Same row updated in place (T13.7) — same id, and exactly one row for
    // this user, not a second one accumulating alongside the first.
    expect(secondRes.body.data.id).toBe(firstRes.body.data.id);
    const scopedCount = await prisma.studyPlan.count({ where: { id: firstRes.body.data.id } });
    expect(scopedCount).toBe(1);
  });

  it('a plan requested before any generation returns 404', async () => {
    const { accessToken } = await registerAndLogin('planner-no-plan-yet');
    const res = await request(app).get('/api/study-plan').set(authHeader(accessToken));
    expect(res.status).toBe(404);
  });

  it('every planner endpoint returns 401 without a token', async () => {
    const getRes = await request(app).get('/api/study-plan');
    const generateRes = await request(app).post('/api/study-plan/generate').send();
    expect(getRes.status).toBe(401);
    expect(generateRes.status).toBe(401);
  });
});
