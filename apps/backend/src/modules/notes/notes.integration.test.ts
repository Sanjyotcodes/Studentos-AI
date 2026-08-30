// Phase 12 (T12.1-T12.3): exercises the real notes module end-to-end — real
// createApp(), real routes, real Prisma — against a reachable Postgres.
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

const sampleBlocks = [
  { id: 'b1', type: 'heading', level: 1, text: 'Chapter 1' },
  { id: 'b2', type: 'paragraph', text: 'An introduction to the topic.' },
  { id: 'b3', type: 'list', items: ['First point', 'Second point'] },
  { id: 'b4', type: 'code', code: 'const x = 1;', language: 'typescript' },
];

async function createNote(
  accessToken: string,
  overrides: Partial<{ title: string; subjectId: string; blocks: unknown[] }> = {},
) {
  const res = await request(app)
    .post('/api/notes')
    .set(authHeader(accessToken))
    .send({ title: overrides.title ?? 'My Note', blocks: overrides.blocks ?? sampleBlocks, ...overrides });
  return res;
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe('T12.1: note CRUD works and is user-scoped', () => {
  it('creates, lists, reads, updates, and deletes a note for its own owner', async () => {
    const { accessToken } = await registerAndLogin('crud');

    const createRes = await createNote(accessToken, { title: 'Thermo notes' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.title).toBe('Thermo notes');
    const noteId = createRes.body.data.id as string;

    const listRes = await request(app).get('/api/notes').set(authHeader(accessToken));
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((n: { id: string }) => n.id === noteId)).toBe(true);

    const getRes = await request(app).get(`/api/notes/${noteId}`).set(authHeader(accessToken));
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.id).toBe(noteId);

    const updateRes = await request(app)
      .patch(`/api/notes/${noteId}`)
      .set(authHeader(accessToken))
      .send({ title: 'Thermo notes (revised)' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.title).toBe('Thermo notes (revised)');

    const deleteRes = await request(app).delete(`/api/notes/${noteId}`).set(authHeader(accessToken));
    expect(deleteRes.status).toBe(204);

    const listAfterDelete = await request(app).get('/api/notes').set(authHeader(accessToken));
    expect(listAfterDelete.body.data.some((n: { id: string }) => n.id === noteId)).toBe(false);
  });

  it('cross-user access to read/update/delete returns 404', async () => {
    const userA = await registerAndLogin('cross-a');
    const userB = await registerAndLogin('cross-b');
    const createRes = await createNote(userA.accessToken, { title: "User A's note" });
    const noteId = createRes.body.data.id as string;

    const getRes = await request(app).get(`/api/notes/${noteId}`).set(authHeader(userB.accessToken));
    const updateRes = await request(app)
      .patch(`/api/notes/${noteId}`)
      .set(authHeader(userB.accessToken))
      .send({ title: 'Hijacked' });
    const deleteRes = await request(app)
      .delete(`/api/notes/${noteId}`)
      .set(authHeader(userB.accessToken));

    expect(getRes.status).toBe(404);
    expect(updateRes.status).toBe(404);
    expect(deleteRes.status).toBe(404);

    const listB = await request(app).get('/api/notes').set(authHeader(userB.accessToken));
    expect(listB.body.data.some((n: { id: string }) => n.id === noteId)).toBe(false);
  });

  it('every note endpoint returns 401 without a token', async () => {
    const listRes = await request(app).get('/api/notes');
    const createRes = await request(app).post('/api/notes').send({ title: 'x', blocks: [] });
    const getRes = await request(app).get(`/api/notes/${randomUUID()}`);
    const updateRes = await request(app).patch(`/api/notes/${randomUUID()}`).send({ title: 'x' });
    const deleteRes = await request(app).delete(`/api/notes/${randomUUID()}`);

    expect(listRes.status).toBe(401);
    expect(createRes.status).toBe(401);
    expect(getRes.status).toBe(401);
    expect(updateRes.status).toBe(401);
    expect(deleteRes.status).toBe(401);
  });

  it('creating/updating a note against another user\'s subjectId returns 404', async () => {
    const userA = await registerAndLogin('foreign-subj-a');
    const userB = await registerAndLogin('foreign-subj-b');
    const subjectIdOwnedByA = await createSubject(userA.accessToken);

    const createRes = await createNote(userB.accessToken, {
      title: 'x',
      subjectId: subjectIdOwnedByA,
    } as never);
    expect(createRes.status).toBe(404);

    const ownNote = await createNote(userB.accessToken, { title: 'Owned by B' });
    const noteId = ownNote.body.data.id as string;
    const updateRes = await request(app)
      .patch(`/api/notes/${noteId}`)
      .set(authHeader(userB.accessToken))
      .send({ subjectId: subjectIdOwnedByA });
    expect(updateRes.status).toBe(404);
  });

  it('deleting a subject leaves its notes in a defined state, never orphaned', async () => {
    const { accessToken } = await registerAndLogin('subject-delete');
    const subjectId = await createSubject(accessToken);
    const noteRes = await createNote(accessToken, { title: 'Linked note', subjectId });
    const noteId = noteRes.body.data.id as string;

    const deleteSubjectRes = await request(app)
      .delete(`/api/subjects/${subjectId}`)
      .set(authHeader(accessToken));
    expect(deleteSubjectRes.status).toBe(204);

    const dbNote = await prisma.note.findUnique({ where: { id: noteId } });
    expect(dbNote).not.toBeNull();
    expect(dbNote?.subjectId).toBeNull();
  });
});

describe('T12.2: block content round-trips without loss or reordering', () => {
  it('returns the same blocks, in the same order, after create and after a plain re-fetch', async () => {
    const { accessToken } = await registerAndLogin('roundtrip');

    const createRes = await createNote(accessToken, { title: 'Round trip note' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.blocks).toEqual(sampleBlocks);

    const noteId = createRes.body.data.id as string;
    const getRes = await request(app).get(`/api/notes/${noteId}`).set(authHeader(accessToken));
    expect(getRes.body.data.blocks).toEqual(sampleBlocks);
  });

  it('preserves a changed block order after an update', async () => {
    const { accessToken } = await registerAndLogin('reorder');
    const createRes = await createNote(accessToken, { title: 'Reorder note' });
    const noteId = createRes.body.data.id as string;

    const reordered = [sampleBlocks[3], sampleBlocks[0], sampleBlocks[2], sampleBlocks[1]];
    const updateRes = await request(app)
      .patch(`/api/notes/${noteId}`)
      .set(authHeader(accessToken))
      .send({ blocks: reordered });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.blocks).toEqual(reordered);

    const getRes = await request(app).get(`/api/notes/${noteId}`).set(authHeader(accessToken));
    expect(getRes.body.data.blocks).toEqual(reordered);
  });
});

describe('T12.3: malformed block payload -> 400, nothing persisted', () => {
  it('an unknown block type returns 400 and creates nothing', async () => {
    const { accessToken } = await registerAndLogin('malformed-type');
    const before = await prisma.note.count();

    const res = await createNote(accessToken, {
      blocks: [{ id: 'b1', type: 'embed', url: 'https://example.com' }],
    } as never);
    expect(res.status).toBe(400);

    const after = await prisma.note.count();
    expect(after).toBe(before);
  });

  it('a block missing its required field returns 400 and creates nothing', async () => {
    const { accessToken } = await registerAndLogin('malformed-missing');
    const before = await prisma.note.count();

    const res = await createNote(accessToken, {
      blocks: [{ id: 'b1', type: 'paragraph' }],
    } as never);
    expect(res.status).toBe(400);

    const after = await prisma.note.count();
    expect(after).toBe(before);
  });

  it('a malformed block on update returns 400 and does not change the stored note', async () => {
    const { accessToken } = await registerAndLogin('malformed-update');
    const createRes = await createNote(accessToken, { title: 'Untouched' });
    const noteId = createRes.body.data.id as string;

    const updateRes = await request(app)
      .patch(`/api/notes/${noteId}`)
      .set(authHeader(accessToken))
      .send({ blocks: [{ id: 'b1', type: 'heading', level: 9, text: 'Bad level' }] });
    expect(updateRes.status).toBe(400);

    const dbNote = await prisma.note.findUnique({ where: { id: noteId } });
    expect(dbNote?.blocks).toEqual(sampleBlocks);
    expect(dbNote?.title).toBe('Untouched');
  });

  it('an empty title returns 400', async () => {
    const { accessToken } = await registerAndLogin('empty-title');
    const res = await createNote(accessToken, { title: '' });
    expect(res.status).toBe(400);
  });
});
