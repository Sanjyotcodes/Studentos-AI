// Phase 11 (T11.1-T11.6): exercises the real tasks module end-to-end — real
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

async function createTask(
  accessToken: string,
  overrides: Partial<{ title: string; dueDate: string; priority: string; status: string; subjectId: string }> = {},
) {
  const res = await request(app)
    .post('/api/tasks')
    .set(authHeader(accessToken))
    .send({ title: overrides.title ?? 'Finish assignment', ...overrides });
  return res;
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe('T11.1: task CRUD works and is scoped to the owning user', () => {
  it('creates, lists, updates, and deletes a task for its own owner', async () => {
    const { accessToken } = await registerAndLogin('crud');

    const createRes = await createTask(accessToken, { title: 'Read chapter 4' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.title).toBe('Read chapter 4');
    expect(createRes.body.data.status).toBe('TODO');
    const taskId = createRes.body.data.id as string;

    const listRes = await request(app).get('/api/tasks').set(authHeader(accessToken));
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((t: { id: string }) => t.id === taskId)).toBe(true);

    const updateRes = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set(authHeader(accessToken))
      .send({ title: 'Read chapter 4 and 5' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.title).toBe('Read chapter 4 and 5');

    const deleteRes = await request(app).delete(`/api/tasks/${taskId}`).set(authHeader(accessToken));
    expect(deleteRes.status).toBe(204);

    const listAfterDelete = await request(app).get('/api/tasks').set(authHeader(accessToken));
    expect(listAfterDelete.body.data.some((t: { id: string }) => t.id === taskId)).toBe(false);
  });

  it('cross-user access to update/delete returns 404', async () => {
    const userA = await registerAndLogin('cross-a');
    const userB = await registerAndLogin('cross-b');
    const createRes = await createTask(userA.accessToken, { title: "User A's task" });
    const taskId = createRes.body.data.id as string;

    const updateRes = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set(authHeader(userB.accessToken))
      .send({ title: 'Hijacked' });
    const deleteRes = await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set(authHeader(userB.accessToken));

    expect(updateRes.status).toBe(404);
    expect(deleteRes.status).toBe(404);

    const listB = await request(app).get('/api/tasks').set(authHeader(userB.accessToken));
    expect(listB.body.data.some((t: { id: string }) => t.id === taskId)).toBe(false);
  });

  it('every task endpoint returns 401 without a token', async () => {
    const listRes = await request(app).get('/api/tasks');
    const createRes = await request(app).post('/api/tasks').send({ title: 'x' });
    const updateRes = await request(app).patch(`/api/tasks/${randomUUID()}`).send({ title: 'x' });
    const deleteRes = await request(app).delete(`/api/tasks/${randomUUID()}`);

    expect(listRes.status).toBe(401);
    expect(createRes.status).toBe(401);
    expect(updateRes.status).toBe(401);
    expect(deleteRes.status).toBe(401);
  });
});

describe('T11.2: creating/updating a task against another user\'s subjectId returns 404', () => {
  it('POST /api/tasks with a foreign subjectId returns 404', async () => {
    const userA = await registerAndLogin('foreign-subj-a');
    const userB = await registerAndLogin('foreign-subj-b');
    const subjectIdOwnedByA = await createSubject(userA.accessToken);

    const res = await createTask(userB.accessToken, { title: 'x', subjectId: subjectIdOwnedByA });
    expect(res.status).toBe(404);
  });

  it('PATCH /api/tasks/:id with a foreign subjectId returns 404', async () => {
    const userA = await registerAndLogin('foreign-subj-patch-a');
    const userB = await registerAndLogin('foreign-subj-patch-b');
    const subjectIdOwnedByA = await createSubject(userA.accessToken);
    const taskRes = await createTask(userB.accessToken, { title: 'Owned by B' });
    const taskId = taskRes.body.data.id as string;

    const res = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set(authHeader(userB.accessToken))
      .send({ subjectId: subjectIdOwnedByA });
    expect(res.status).toBe(404);
  });
});

describe('T11.3: invalid dueDate/priority/status return 400', () => {
  it('an invalid dueDate format returns 400', async () => {
    const { accessToken } = await registerAndLogin('invalid-date');
    const res = await createTask(accessToken, { title: 'x', dueDate: '31-12-2026' });
    expect(res.status).toBe(400);
  });

  it('an invalid priority value returns 400', async () => {
    const { accessToken } = await registerAndLogin('invalid-priority');
    const res = await createTask(accessToken, { title: 'x', priority: 'URGENT' });
    expect(res.status).toBe(400);
  });

  it('an invalid status value returns 400', async () => {
    const { accessToken } = await registerAndLogin('invalid-status');
    const res = await createTask(accessToken, { title: 'x', status: 'ARCHIVED' });
    expect(res.status).toBe(400);
  });

  it('an empty title returns 400', async () => {
    const { accessToken } = await registerAndLogin('invalid-title');
    const res = await createTask(accessToken, { title: '' });
    expect(res.status).toBe(400);
  });
});

describe('T11.4: filtering by subject, status, and due window each return correct sets', () => {
  it('filters correctly across all three dimensions', async () => {
    const { accessToken } = await registerAndLogin('filter');
    const subjectId = await createSubject(accessToken, 'Thermodynamics');

    const taskWithSubject = await createTask(accessToken, {
      title: 'Subject task',
      subjectId,
      dueDate: '2026-02-05',
    });
    const taskNoSubject = await createTask(accessToken, {
      title: 'No-subject task',
      dueDate: '2026-02-15',
    });
    const doneTask = await createTask(accessToken, {
      title: 'Done task',
      status: 'DONE',
      dueDate: '2026-02-10',
    });

    const bySubject = await request(app)
      .get('/api/tasks')
      .set(authHeader(accessToken))
      .query({ subjectId });
    const bySubjectIds = bySubject.body.data.map((t: { id: string }) => t.id);
    expect(bySubjectIds).toContain(taskWithSubject.body.data.id);
    expect(bySubjectIds).not.toContain(taskNoSubject.body.data.id);
    expect(bySubjectIds).not.toContain(doneTask.body.data.id);

    const byStatus = await request(app)
      .get('/api/tasks')
      .set(authHeader(accessToken))
      .query({ status: 'DONE' });
    const byStatusIds = byStatus.body.data.map((t: { id: string }) => t.id);
    expect(byStatusIds).toContain(doneTask.body.data.id);
    expect(byStatusIds).not.toContain(taskWithSubject.body.data.id);

    const byWindow = await request(app)
      .get('/api/tasks')
      .set(authHeader(accessToken))
      .query({ from: '2026-02-04', to: '2026-02-06' });
    const byWindowIds = byWindow.body.data.map((t: { id: string }) => t.id);
    expect(byWindowIds).toContain(taskWithSubject.body.data.id);
    expect(byWindowIds).not.toContain(taskNoSubject.body.data.id);
    expect(byWindowIds).not.toContain(doneTask.body.data.id);
  });
});

describe('T11.5: deleting a subject leaves its tasks in a defined state, never orphaned', () => {
  it('a task keeps existing with subjectId set to null after its subject is deleted', async () => {
    const { accessToken } = await registerAndLogin('subject-delete');
    const subjectId = await createSubject(accessToken);
    const taskRes = await createTask(accessToken, { title: 'Linked task', subjectId });
    const taskId = taskRes.body.data.id as string;

    const deleteSubjectRes = await request(app)
      .delete(`/api/subjects/${subjectId}`)
      .set(authHeader(accessToken));
    expect(deleteSubjectRes.status).toBe(204);

    const dbTask = await prisma.task.findUnique({ where: { id: taskId } });
    expect(dbTask).not.toBeNull();
    expect(dbTask?.subjectId).toBeNull();

    const listRes = await request(app).get('/api/tasks').set(authHeader(accessToken));
    const found = listRes.body.data.find((t: { id: string }) => t.id === taskId);
    expect(found).toBeDefined();
    expect(found.subjectId).toBeNull();
  });
});

describe('T11.6: completion toggle is idempotent', () => {
  it('setting status to DONE twice in a row produces the same result both times', async () => {
    const { accessToken } = await registerAndLogin('idempotent');
    const taskRes = await createTask(accessToken, { title: 'Toggle me' });
    const taskId = taskRes.body.data.id as string;

    const first = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set(authHeader(accessToken))
      .send({ status: 'DONE' });
    const second = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set(authHeader(accessToken))
      .send({ status: 'DONE' });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.data.status).toBe('DONE');
    expect(second.body.data.status).toBe('DONE');
    expect(second.body.data.id).toBe(first.body.data.id);

    const count = await prisma.task.count({ where: { id: taskId } });
    expect(count).toBe(1);
  });
});
