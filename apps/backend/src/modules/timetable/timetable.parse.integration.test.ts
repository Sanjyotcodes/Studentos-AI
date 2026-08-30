// Phase 16 (T16.4, T16.5): exercises POST /api/timetable/parse end-to-end —
// real createApp(), real routes, real Prisma — with the Gemini SDK mocked,
// same approach as planner.integration.test.ts.
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
  return { accessToken: res.body.data.accessToken as string, userId: res.body.data.user.id as string };
}

// Scoped to the user under test, not a bare table-wide count — this file's
// tests run as a separate vitest worker from timetable.integration.test.ts,
// which creates and deletes many TimetableSlot rows of its own; an
// unscoped count() here would be racy against that concurrent file.
function countSlotsFor(userId: string): Promise<number> {
  return prisma.timetableSlot.count({ where: { userId } });
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

function fakeImageBuffer(): Buffer {
  return Buffer.from('fake-image-bytes-not-a-real-png');
}

beforeEach(() => {
  generateContentMock.mockReset();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('T16.4: POST /api/timetable/parse never persists anything', () => {
  it('returns proposed slots for review without writing to TimetableSlot', async () => {
    const { accessToken, userId } = await registerAndLogin('parse-review-only');
    const subjectId = await createSubject(accessToken, 'Thermodynamics');
    const before = await countSlotsFor(userId);

    generateContentMock.mockResolvedValueOnce(
      jsonResponse({
        slots: [
          { subjectName: 'Thermodynamics', dayOfWeek: 'MON', startTime: '09:00', endTime: '10:00' },
          { subjectName: 'Unknown Elective', dayOfWeek: 'TUE', startTime: '11:00', endTime: '12:00' },
        ],
      }),
    );

    const res = await request(app)
      .post('/api/timetable/parse')
      .set(authHeader(accessToken))
      .attach('file', fakeImageBuffer(), { filename: 'timetable.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.data.slots).toHaveLength(2);

    // The known subject name is matched; the unrecognized one is left for
    // manual selection rather than guessed.
    const matched = res.body.data.slots.find((s: { subjectName: string }) => s.subjectName === 'Thermodynamics');
    const unmatched = res.body.data.slots.find((s: { subjectName: string }) => s.subjectName === 'Unknown Elective');
    expect(matched.matchedSubjectId).toBe(subjectId);
    expect(unmatched.matchedSubjectId).toBeNull();

    const after = await countSlotsFor(userId);
    expect(after).toBe(before);
  });

  it('requires authentication', async () => {
    const res = await request(app)
      .post('/api/timetable/parse')
      .attach('file', fakeImageBuffer(), { filename: 'timetable.png', contentType: 'image/png' });
    expect(res.status).toBe(401);
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it('returns 400 when no file is attached', async () => {
    const { accessToken } = await registerAndLogin('parse-no-file');
    const res = await request(app).post('/api/timetable/parse').set(authHeader(accessToken));
    expect(res.status).toBe(400);
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it('returns 400 for an unsupported file type', async () => {
    const { accessToken } = await registerAndLogin('parse-bad-type');
    const res = await request(app)
      .post('/api/timetable/parse')
      .set(authHeader(accessToken))
      .attach('file', Buffer.from('not an image'), { filename: 'notes.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it('returns 413 for an oversized file, not a raw 500', async () => {
    const { accessToken } = await registerAndLogin('parse-oversized');
    const oversized = Buffer.alloc(8 * 1024 * 1024 + 1024, 0);
    const res = await request(app)
      .post('/api/timetable/parse')
      .set(authHeader(accessToken))
      .attach('file', oversized, { filename: 'huge.png', contentType: 'image/png' });
    expect(res.status).toBe(413);
    expect(res.body.success).toBe(false);
  });
});

describe('T16.5: a malformed/refused AI extraction is rejected gracefully, nothing persisted', () => {
  it('non-JSON text is rejected as a graceful error and creates nothing', async () => {
    const { accessToken, userId } = await registerAndLogin('parse-non-json');
    const before = await countSlotsFor(userId);
    generateContentMock.mockResolvedValueOnce({
      text: 'Sure! Here is your timetable described in prose, not JSON.',
      candidates: [{ finishReason: 'STOP' }],
    });

    const res = await request(app)
      .post('/api/timetable/parse')
      .set(authHeader(accessToken))
      .attach('file', fakeImageBuffer(), { filename: 'timetable.png', contentType: 'image/png' });

    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
    expect(await countSlotsFor(userId)).toBe(before);
  });

  it('a response missing the required "slots" field is rejected and creates nothing', async () => {
    const { accessToken } = await registerAndLogin('parse-missing-field');
    generateContentMock.mockResolvedValueOnce(jsonResponse({ entries: [] }));

    const res = await request(app)
      .post('/api/timetable/parse')
      .set(authHeader(accessToken))
      .attach('file', fakeImageBuffer(), { filename: 'timetable.png', contentType: 'image/png' });

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('AI_INVALID_TIMETABLE');
  });

  it('an entry with an invalid time shape is rejected and creates nothing', async () => {
    const { accessToken } = await registerAndLogin('parse-bad-time');
    generateContentMock.mockResolvedValueOnce(
      jsonResponse({
        slots: [{ subjectName: 'Physics', dayOfWeek: 'MON', startTime: '9am', endTime: '10am' }],
      }),
    );

    const res = await request(app)
      .post('/api/timetable/parse')
      .set(authHeader(accessToken))
      .attach('file', fakeImageBuffer(), { filename: 'timetable.png', contentType: 'image/png' });

    expect(res.status).toBe(502);
  });

  it('a refusal is treated as a failure — graceful error, nothing persisted', async () => {
    const { accessToken, userId } = await registerAndLogin('parse-refused');
    const before = await countSlotsFor(userId);
    generateContentMock.mockResolvedValueOnce(refusalResponse());

    const res = await request(app)
      .post('/api/timetable/parse')
      .set(authHeader(accessToken))
      .attach('file', fakeImageBuffer(), { filename: 'timetable.png', contentType: 'image/png' });

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('AI_TIMETABLE_REFUSED');
    expect(await countSlotsFor(userId)).toBe(before);
  });
});
