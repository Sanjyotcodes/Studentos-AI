// Phase 6 (T6.3–T6.7, T6.10, T6.15, T6.18 for attendance): exercises the real
// attendance module end-to-end — real createApp(), real routes, real Prisma —
// against a reachable Postgres (see docker-compose.yml). Pure arithmetic edge
// cases (T6.8, T6.9, T6.11–T6.14) live in attendance.math.test.ts instead,
// where they don't need a database.
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

async function createSubject(
  accessToken: string,
  overrides: Partial<{ name: string; code: string; minAttendancePercent: number }> = {},
): Promise<string> {
  const res = await request(app)
    .post('/api/subjects')
    .set(authHeader(accessToken))
    .send({
      name: overrides.name ?? 'Test Subject',
      code: overrides.code ?? uniqueCode('SUBJ'),
      ...(overrides.minAttendancePercent !== undefined
        ? { minAttendancePercent: overrides.minAttendancePercent }
        : {}),
    });
  return res.body.data.id as string;
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/attendance', () => {
  it('T6.4: marking attendance twice for the same subject+date updates rather than duplicating', async () => {
    const { accessToken } = await registerAndLogin('mark-idem');
    const subjectId = await createSubject(accessToken);

    const first = await request(app)
      .post('/api/attendance')
      .set(authHeader(accessToken))
      .send({ subjectId, date: '2026-01-05', status: 'PRESENT' });
    const second = await request(app)
      .post('/api/attendance')
      .set(authHeader(accessToken))
      .send({ subjectId, date: '2026-01-05', status: 'ABSENT' });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.data.id).toBe(first.body.data.id);
    expect(second.body.data.status).toBe('ABSENT');

    const count = await prisma.attendanceRecord.count({
      where: { subjectId, date: new Date('2026-01-05T00:00:00.000Z') },
    });
    expect(count).toBe(1);
  });

  it('T6.5: marking attendance for a subject the user does not own returns 404', async () => {
    const userA = await registerAndLogin('mark-a');
    const userB = await registerAndLogin('mark-b');
    const subjectId = await createSubject(userA.accessToken);

    const res = await request(app)
      .post('/api/attendance')
      .set(authHeader(userB.accessToken))
      .send({ subjectId, date: '2026-01-05', status: 'PRESENT' });

    expect(res.status).toBe(404);
  });

  it('T6.6: marking attendance with a future date returns 400', async () => {
    const { accessToken } = await registerAndLogin('mark-future');
    const subjectId = await createSubject(accessToken);

    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 30);
    const futureDateStr = future.toISOString().slice(0, 10);

    const res = await request(app)
      .post('/api/attendance')
      .set(authHeader(accessToken))
      .send({ subjectId, date: futureDateStr, status: 'PRESENT' });

    expect(res.status).toBe(400);
  });

  it('T6.7: marking with an invalid status returns 400', async () => {
    const { accessToken } = await registerAndLogin('mark-badstatus');
    const subjectId = await createSubject(accessToken);

    const res = await request(app)
      .post('/api/attendance')
      .set(authHeader(accessToken))
      .send({ subjectId, date: '2026-01-05', status: 'LATE' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/attendance', () => {
  it('T6.3: a user\'s attendance list never contains another user\'s records', async () => {
    const userA = await registerAndLogin('list-a');
    const userB = await registerAndLogin('list-b');
    const subjectA = await createSubject(userA.accessToken);
    const subjectB = await createSubject(userB.accessToken);

    await request(app)
      .post('/api/attendance')
      .set(authHeader(userA.accessToken))
      .send({ subjectId: subjectA, date: '2026-01-05', status: 'PRESENT' });
    await request(app)
      .post('/api/attendance')
      .set(authHeader(userB.accessToken))
      .send({ subjectId: subjectB, date: '2026-01-05', status: 'PRESENT' });

    const listA = await request(app).get('/api/attendance').set(authHeader(userA.accessToken));

    expect(
      listA.body.data.every((record: { subjectId: string }) => record.subjectId === subjectA),
    ).toBe(true);
    expect(
      listA.body.data.some((record: { subjectId: string }) => record.subjectId === subjectB),
    ).toBe(false);
  });

  it('T6.15: the date-range filter returns only records inside the range, boundaries inclusive', async () => {
    const { accessToken } = await registerAndLogin('range');
    const subjectId = await createSubject(accessToken);

    for (const date of ['2026-02-01', '2026-02-05', '2026-02-10', '2026-02-15']) {
      await request(app)
        .post('/api/attendance')
        .set(authHeader(accessToken))
        .send({ subjectId, date, status: 'PRESENT' });
    }

    const res = await request(app)
      .get('/api/attendance')
      .set(authHeader(accessToken))
      .query({ subjectId, from: '2026-02-05', to: '2026-02-10' });

    const returnedDates = res.body.data.map((record: { date: string }) => record.date).sort();
    expect(returnedDates).toEqual(['2026-02-05', '2026-02-10']);
  });
});

describe('PATCH/DELETE /api/attendance/:id ownership', () => {
  it('a user cannot update or delete another user\'s attendance record', async () => {
    const userA = await registerAndLogin('own-a');
    const userB = await registerAndLogin('own-b');
    const subjectId = await createSubject(userA.accessToken);

    const markRes = await request(app)
      .post('/api/attendance')
      .set(authHeader(userA.accessToken))
      .send({ subjectId, date: '2026-01-06', status: 'PRESENT' });
    const recordId = markRes.body.data.id as string;

    const updateRes = await request(app)
      .patch(`/api/attendance/${recordId}`)
      .set(authHeader(userB.accessToken))
      .send({ status: 'ABSENT' });
    const deleteRes = await request(app)
      .delete(`/api/attendance/${recordId}`)
      .set(authHeader(userB.accessToken));

    expect(updateRes.status).toBe(404);
    expect(deleteRes.status).toBe(404);
  });
});

describe('GET /api/attendance/summary', () => {
  it('T6.10: CANCELLED classes are excluded from both numerator and denominator', async () => {
    const { accessToken } = await registerAndLogin('cancel-summary');
    const subjectId = await createSubject(accessToken, { minAttendancePercent: 75 });

    const records: Array<[string, string]> = [
      ['2026-03-01', 'PRESENT'],
      ['2026-03-02', 'PRESENT'],
      ['2026-03-03', 'ABSENT'],
      ['2026-03-04', 'CANCELLED'],
      ['2026-03-05', 'CANCELLED'],
    ];
    for (const [date, status] of records) {
      await request(app)
        .post('/api/attendance')
        .set(authHeader(accessToken))
        .send({ subjectId, date, status });
    }

    const res = await request(app)
      .get('/api/attendance/summary')
      .set(authHeader(accessToken))
      .query({ subjectId });

    expect(res.status).toBe(200);
    const subjectSummary = res.body.data.subjects[0];
    expect(subjectSummary.attended).toBe(2);
    expect(subjectSummary.total).toBe(3);
    // The service rounds percentage to 2 decimal places (see computePercentage).
    expect(subjectSummary.percentage).toBe(66.67);
  });

  it('T16.10: HOLIDAY records are excluded from both numerator and denominator, same as CANCELLED', async () => {
    const { accessToken } = await registerAndLogin('holiday-summary');
    const subjectId = await createSubject(accessToken, { minAttendancePercent: 75 });

    const records: Array<[string, string]> = [
      ['2026-03-01', 'PRESENT'],
      ['2026-03-02', 'PRESENT'],
      ['2026-03-03', 'ABSENT'],
      ['2026-03-04', 'CANCELLED'],
      ['2026-03-05', 'HOLIDAY'],
      ['2026-03-06', 'HOLIDAY'],
    ];
    for (const [date, status] of records) {
      await request(app)
        .post('/api/attendance')
        .set(authHeader(accessToken))
        .send({ subjectId, date, status });
    }

    const res = await request(app)
      .get('/api/attendance/summary')
      .set(authHeader(accessToken))
      .query({ subjectId });

    expect(res.status).toBe(200);
    const subjectSummary = res.body.data.subjects[0];
    // Only the 2 PRESENT + 1 ABSENT count — 2 CANCELLED/HOLIDAY records
    // (1 + 2) are excluded from both sides, same as T6.10 above.
    expect(subjectSummary.attended).toBe(2);
    expect(subjectSummary.total).toBe(3);
    expect(subjectSummary.percentage).toBe(66.67);

    // Confirm the individual records themselves kept their distinct
    // statuses rather than being collapsed into one another.
    const listRes = await request(app)
      .get('/api/attendance')
      .set(authHeader(accessToken))
      .query({ subjectId });
    const byDate = new Map(listRes.body.data.map((r: { date: string; status: string }) => [r.date, r.status]));
    expect(byDate.get('2026-03-04')).toBe('CANCELLED');
    expect(byDate.get('2026-03-05')).toBe('HOLIDAY');
    expect(byDate.get('2026-03-06')).toBe('HOLIDAY');
  });
});

describe('Auth required (T6.18, attendance)', () => {
  it('every attendance endpoint returns 401 without a token', async () => {
    const listRes = await request(app).get('/api/attendance');
    const markRes = await request(app)
      .post('/api/attendance')
      .send({ subjectId: randomUUID(), date: '2026-01-01', status: 'PRESENT' });
    const summaryRes = await request(app).get('/api/attendance/summary');
    const updateRes = await request(app)
      .patch(`/api/attendance/${randomUUID()}`)
      .send({ status: 'ABSENT' });
    const deleteRes = await request(app).delete(`/api/attendance/${randomUUID()}`);

    expect(listRes.status).toBe(401);
    expect(markRes.status).toBe(401);
    expect(summaryRes.status).toBe(401);
    expect(updateRes.status).toBe(401);
    expect(deleteRes.status).toBe(401);
  });
});
