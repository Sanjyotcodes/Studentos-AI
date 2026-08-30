// Phase 15 (T15.4): GET /api/health reports DB connectivity and returns a
// non-200 status when the database is unreachable. Prisma's `$queryRaw` is
// mocked here to deterministically simulate an outage — the "happy path"
// (DB actually reachable) is exercised for free by every other integration
// test file, which all depend on a real Postgres connection succeeding.
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./prisma', () => ({
  prisma: { $queryRaw: vi.fn() },
}));

const { prisma } = await import('./prisma');
const { createApp } = await import('../app');

const app = createApp();

afterEach(() => {
  vi.mocked(prisma.$queryRaw).mockReset();
});

describe('T15.4: GET /api/health reports DB connectivity', () => {
  it('returns 200 with db: connected when the database is reachable', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ '?column?': 1 }]);

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { status: 'ok', db: 'connected' } });
  });

  it('returns a non-200 status when the database is unreachable', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('connection refused'));

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    // The underlying driver error message must never reach the client.
    expect(JSON.stringify(res.body)).not.toContain('connection refused');
  });
});
