// Phase 16 (T16.1-T16.3): exercises the real timetable module end-to-end —
// real createApp(), real routes, real Prisma.
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
  return { accessToken: res.body.data.accessToken as string, userId: res.body.data.user.id as string };
}

// Scoped to the user under test rather than a bare table-wide count — this
// file runs as a separate vitest worker from timetable.parse.integration.test.ts,
// which also creates TimetableSlot rows; an unscoped count() here would be
// racy against that concurrent file.
function countSlotsFor(userId: string): Promise<number> {
  return prisma.timetableSlot.count({ where: { userId } });
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

async function createSlot(
  accessToken: string,
  overrides: Partial<{ subjectId: string; dayOfWeek: string; startTime: string; endTime: string }> = {},
) {
  const subjectId = overrides.subjectId ?? (await createSubject(accessToken));
  return request(app)
    .post('/api/timetable')
    .set(authHeader(accessToken))
    .send({
      subjectId,
      dayOfWeek: overrides.dayOfWeek ?? 'MON',
      startTime: overrides.startTime ?? '09:00',
      endTime: overrides.endTime ?? '10:00',
    });
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe('T16.1: timetable slot CRUD works and is user-scoped', () => {
  it('creates, lists, updates, and deletes a slot for its own owner', async () => {
    const { accessToken } = await registerAndLogin('crud');
    const subjectId = await createSubject(accessToken);

    const createRes = await createSlot(accessToken, { subjectId, dayOfWeek: 'TUE', startTime: '11:00', endTime: '12:00' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.dayOfWeek).toBe('TUE');
    const slotId = createRes.body.data.id as string;

    const listRes = await request(app).get('/api/timetable').set(authHeader(accessToken));
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((s: { id: string }) => s.id === slotId)).toBe(true);

    const updateRes = await request(app)
      .patch(`/api/timetable/${slotId}`)
      .set(authHeader(accessToken))
      .send({ startTime: '11:30' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.startTime).toBe('11:30');

    const deleteRes = await request(app).delete(`/api/timetable/${slotId}`).set(authHeader(accessToken));
    expect(deleteRes.status).toBe(204);

    const listAfterDelete = await request(app).get('/api/timetable').set(authHeader(accessToken));
    expect(listAfterDelete.body.data.some((s: { id: string }) => s.id === slotId)).toBe(false);
  });

  it('cross-user access to update/delete returns 404', async () => {
    const userA = await registerAndLogin('cross-a');
    const userB = await registerAndLogin('cross-b');
    const createRes = await createSlot(userA.accessToken);
    const slotId = createRes.body.data.id as string;

    const updateRes = await request(app)
      .patch(`/api/timetable/${slotId}`)
      .set(authHeader(userB.accessToken))
      .send({ startTime: '08:00' });
    const deleteRes = await request(app)
      .delete(`/api/timetable/${slotId}`)
      .set(authHeader(userB.accessToken));

    expect(updateRes.status).toBe(404);
    expect(deleteRes.status).toBe(404);
  });

  it('creating a slot against another user\'s subjectId returns 404', async () => {
    const userA = await registerAndLogin('foreign-subj-a');
    const userB = await registerAndLogin('foreign-subj-b');
    const subjectIdOwnedByA = await createSubject(userA.accessToken);

    const res = await createSlot(userB.accessToken, { subjectId: subjectIdOwnedByA });
    expect(res.status).toBe(404);
  });

  it('deleting a subject removes its timetable slots (no orphaned FK)', async () => {
    const { accessToken } = await registerAndLogin('subject-delete');
    const subjectId = await createSubject(accessToken);
    const slotRes = await createSlot(accessToken, { subjectId });
    const slotId = slotRes.body.data.id as string;

    const deleteSubjectRes = await request(app)
      .delete(`/api/subjects/${subjectId}`)
      .set(authHeader(accessToken));
    expect(deleteSubjectRes.status).toBe(204);

    const dbSlot = await prisma.timetableSlot.findUnique({ where: { id: slotId } });
    expect(dbSlot).toBeNull();
  });

  it('every timetable endpoint returns 401 without a token', async () => {
    const listRes = await request(app).get('/api/timetable');
    const createRes = await request(app)
      .post('/api/timetable')
      .send({ subjectId: randomUUID(), dayOfWeek: 'MON', startTime: '09:00', endTime: '10:00' });
    const updateRes = await request(app).patch(`/api/timetable/${randomUUID()}`).send({ startTime: '08:00' });
    const deleteRes = await request(app).delete(`/api/timetable/${randomUUID()}`);
    const todayRes = await request(app).get('/api/timetable/today');

    expect(listRes.status).toBe(401);
    expect(createRes.status).toBe(401);
    expect(updateRes.status).toBe(401);
    expect(deleteRes.status).toBe(401);
    expect(todayRes.status).toBe(401);
  });
});

describe('T16.2: an overlapping slot returns 409', () => {
  it('creating a slot that overlaps an existing one (same day, overlapping time) returns 409', async () => {
    const { accessToken } = await registerAndLogin('overlap-create');
    await createSlot(accessToken, { dayOfWeek: 'WED', startTime: '09:00', endTime: '10:00' });

    const res = await createSlot(accessToken, { dayOfWeek: 'WED', startTime: '09:30', endTime: '10:30' });
    expect(res.status).toBe(409);
  });

  it('back-to-back slots (end === next start) do not count as overlapping', async () => {
    const { accessToken } = await registerAndLogin('back-to-back');
    await createSlot(accessToken, { dayOfWeek: 'THU', startTime: '09:00', endTime: '10:00' });

    const res = await createSlot(accessToken, { dayOfWeek: 'THU', startTime: '10:00', endTime: '11:00' });
    expect(res.status).toBe(201);
  });

  it('the same time range on a different day does not overlap', async () => {
    const { accessToken } = await registerAndLogin('different-day');
    await createSlot(accessToken, { dayOfWeek: 'FRI', startTime: '09:00', endTime: '10:00' });

    const res = await createSlot(accessToken, { dayOfWeek: 'SAT', startTime: '09:00', endTime: '10:00' });
    expect(res.status).toBe(201);
  });

  it('updating a slot to overlap another existing slot returns 409', async () => {
    const { accessToken } = await registerAndLogin('overlap-update');
    await createSlot(accessToken, { dayOfWeek: 'MON', startTime: '09:00', endTime: '10:00' });
    const secondRes = await createSlot(accessToken, { dayOfWeek: 'MON', startTime: '11:00', endTime: '12:00' });
    const secondId = secondRes.body.data.id as string;

    const res = await request(app)
      .patch(`/api/timetable/${secondId}`)
      .set(authHeader(accessToken))
      .send({ startTime: '09:30' });
    expect(res.status).toBe(409);
  });

  it('updating a slot to its own current values does not conflict with itself', async () => {
    const { accessToken } = await registerAndLogin('self-update');
    const createRes = await createSlot(accessToken, { dayOfWeek: 'TUE', startTime: '09:00', endTime: '10:00' });
    const slotId = createRes.body.data.id as string;

    const res = await request(app)
      .patch(`/api/timetable/${slotId}`)
      .set(authHeader(accessToken))
      .send({ startTime: '09:00' });
    expect(res.status).toBe(200);
  });
});

describe('T16.3: end time at or before start time returns 400', () => {
  it('end === start on create returns 400 and persists nothing', async () => {
    const { accessToken, userId } = await registerAndLogin('equal-times');
    const before = await countSlotsFor(userId);
    const res = await createSlot(accessToken, { startTime: '09:00', endTime: '09:00' });
    expect(res.status).toBe(400);
    const after = await countSlotsFor(userId);
    expect(after).toBe(before);
  });

  it('end before start on create returns 400', async () => {
    const { accessToken } = await registerAndLogin('reversed-times');
    const res = await createSlot(accessToken, { startTime: '10:00', endTime: '09:00' });
    expect(res.status).toBe(400);
  });

  it('an update that pushes endTime to or before the merged startTime returns 400', async () => {
    const { accessToken } = await registerAndLogin('update-invalid-range');
    const createRes = await createSlot(accessToken, { startTime: '09:00', endTime: '10:00' });
    const slotId = createRes.body.data.id as string;

    const res = await request(app)
      .patch(`/api/timetable/${slotId}`)
      .set(authHeader(accessToken))
      .send({ endTime: '09:00' });
    expect(res.status).toBe(400);

    const dbSlot = await prisma.timetableSlot.findUnique({ where: { id: slotId } });
    expect(dbSlot?.endTime).toBe('10:00');
  });

  it('a malformed time string returns 400', async () => {
    const { accessToken } = await registerAndLogin('malformed-time');
    const res = await createSlot(accessToken, { startTime: '9am', endTime: '10:00' });
    expect(res.status).toBe(400);
  });
});

describe('T16.6: GET /api/timetable/today matches exactly the subjects scheduled that day', () => {
  // 2026-08-17 is a Monday and 2026-08-18 a Tuesday — using explicit ?date=
  // values (rather than the server's real "today") keeps this deterministic
  // regardless of what day the test suite actually runs on, same reasoning
  // as the ?date= param's own doc comment in schemas/index.ts.
  it('returns only subjects with a slot on the requested day, deduplicated', async () => {
    const { accessToken } = await registerAndLogin('today-match');
    const mondaySubjectId = await createSubject(accessToken, 'Monday Subject');
    const tuesdaySubjectId = await createSubject(accessToken, 'Tuesday Subject');
    const unscheduledSubjectId = await createSubject(accessToken, 'Unscheduled Subject');

    // Two Monday slots for the same subject — must still be one entry.
    await createSlot(accessToken, {
      subjectId: mondaySubjectId,
      dayOfWeek: 'MON',
      startTime: '09:00',
      endTime: '10:00',
    });
    await createSlot(accessToken, {
      subjectId: mondaySubjectId,
      dayOfWeek: 'MON',
      startTime: '14:00',
      endTime: '15:00',
    });
    await createSlot(accessToken, {
      subjectId: tuesdaySubjectId,
      dayOfWeek: 'TUE',
      startTime: '09:00',
      endTime: '10:00',
    });

    const mondayRes = await request(app)
      .get('/api/timetable/today')
      .set(authHeader(accessToken))
      .query({ date: '2026-08-17' });
    expect(mondayRes.status).toBe(200);
    expect(mondayRes.body.data.dayOfWeek).toBe('MON');
    expect(mondayRes.body.data.subjectIds).toEqual([mondaySubjectId]);
    expect(mondayRes.body.data.subjectIds).not.toContain(tuesdaySubjectId);
    expect(mondayRes.body.data.subjectIds).not.toContain(unscheduledSubjectId);

    const tuesdayRes = await request(app)
      .get('/api/timetable/today')
      .set(authHeader(accessToken))
      .query({ date: '2026-08-18' });
    expect(tuesdayRes.status).toBe(200);
    expect(tuesdayRes.body.data.dayOfWeek).toBe('TUE');
    expect(tuesdayRes.body.data.subjectIds).toEqual([tuesdaySubjectId]);
  });

  it('a user with no timetable at all gets an empty list, not an error (T16.8)', async () => {
    const { accessToken } = await registerAndLogin('today-empty');
    const res = await request(app)
      .get('/api/timetable/today')
      .set(authHeader(accessToken))
      .query({ date: '2026-08-17' });
    expect(res.status).toBe(200);
    expect(res.body.data.subjectIds).toEqual([]);
  });
});
