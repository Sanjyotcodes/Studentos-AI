// Phase 12 (T12.4-T12.5): POST /api/ai/summarize-note routes through the same
// ai.service.ts as the Phase 10 endpoints — same mocked-SDK approach as
// ai.integration.test.ts, since these tests must run without a real API key.
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

function successResponse(text: string) {
  return { text, candidates: [{ finishReason: 'STOP' }] };
}

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

async function createNote(accessToken: string, blocks: unknown[], title = 'Note') {
  const res = await request(app)
    .post('/api/notes')
    .set(authHeader(accessToken))
    .send({ title, blocks });
  return res.body.data.id as string;
}

beforeEach(() => {
  generateContentMock.mockReset();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('T12.4: summarization goes through ai.service.ts', () => {
  it('POST /api/ai/summarize-note returns { summary, refused } via the mocked Gemini call', async () => {
    const { accessToken } = await registerAndLogin('summarize-note-success');
    const noteId = await createNote(accessToken, [
      { id: 'b1', type: 'heading', level: 1, text: 'Thermodynamics' },
      { id: 'b2', type: 'paragraph', text: 'The first law of thermodynamics states energy is conserved.' },
    ]);
    generateContentMock.mockResolvedValueOnce(successResponse('Energy is conserved in isolated systems.'));

    const res = await request(app)
      .post('/api/ai/summarize-note')
      .set(authHeader(accessToken))
      .send({ noteId });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: { summary: 'Energy is conserved in isolated systems.', refused: false },
    });
    expect(generateContentMock).toHaveBeenCalledTimes(1);
    const sentContent = generateContentMock.mock.calls[0]![0].contents as string;
    expect(sentContent).toContain('The first law of thermodynamics');
  });

  it('requires authentication', async () => {
    const res = await request(app).post('/api/ai/summarize-note').send({ noteId: randomUUID() });
    expect(res.status).toBe(401);
  });

  it("a note owned by another user returns 404 and never reaches the model", async () => {
    const owner = await registerAndLogin('note-owner');
    const other = await registerAndLogin('note-other');
    const noteId = await createNote(owner.accessToken, [
      { id: 'b1', type: 'paragraph', text: 'Private content' },
    ]);

    const res = await request(app)
      .post('/api/ai/summarize-note')
      .set(authHeader(other.accessToken))
      .send({ noteId });

    expect(res.status).toBe(404);
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it('a malformed noteId returns 400', async () => {
    const { accessToken } = await registerAndLogin('summarize-bad-id');
    const res = await request(app)
      .post('/api/ai/summarize-note')
      .set(authHeader(accessToken))
      .send({ noteId: 'not-a-uuid' });
    expect(res.status).toBe(400);
    expect(generateContentMock).not.toHaveBeenCalled();
  });
});

describe('T12.5: summarizing an empty note is handled without an API call', () => {
  it('a note with zero blocks returns a friendly message without calling Gemini', async () => {
    const { accessToken } = await registerAndLogin('empty-note');
    const noteId = await createNote(accessToken, []);

    const res = await request(app)
      .post('/api/ai/summarize-note')
      .set(authHeader(accessToken))
      .send({ noteId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.refused).toBe(false);
    expect(typeof res.body.data.summary).toBe('string');
    expect(res.body.data.summary.length).toBeGreaterThan(0);
    expect(generateContentMock).not.toHaveBeenCalled();
  });

  it('a note whose blocks are all blank text also skips the API call', async () => {
    const { accessToken } = await registerAndLogin('blank-note');
    const noteId = await createNote(accessToken, [
      { id: 'b1', type: 'paragraph', text: '   ' },
      { id: 'b2', type: 'list', items: [] },
    ]);

    const res = await request(app)
      .post('/api/ai/summarize-note')
      .set(authHeader(accessToken))
      .send({ noteId });

    expect(res.status).toBe(200);
    expect(res.body.data.refused).toBe(false);
    expect(generateContentMock).not.toHaveBeenCalled();
  });
});
