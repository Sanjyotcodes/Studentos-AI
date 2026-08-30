// Phase 4 (T4.5–T4.7): exercises the real, fully-assembled app — unknown
// routes, CORS rejection, and the global rate limiter. Each test builds its
// own createApp() instance so the rate limiter's in-memory counter never
// leaks between tests.
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';

describe('createApp (T4.5, T4.6)', () => {
  it('T4.5: an unknown route returns HTTP 404 in the standard JSON envelope, not an HTML page', async () => {
    const res = await request(createApp()).get('/this-route-does-not-exist');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });

  it('T4.6: a request from a disallowed origin is rejected by CORS', async () => {
    const res = await request(createApp())
      .get('/api/health')
      .set('Origin', 'http://evil.example.com');

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Origin not allowed by CORS' },
    });
  });

  it('a request from the configured origin is allowed through', async () => {
    const res = await request(createApp())
      .get('/api/health')
      .set('Origin', 'http://localhost:3000');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { status: 'ok', db: 'connected' } });
  });
});

describe('global rate limiter (T4.7)', () => {
  it('exceeding the limit returns HTTP 429 in the standard envelope', async () => {
    const app = createApp();
    // Default limit is 100 requests per window (see rateLimit.middleware.ts) —
    // send one more than that, concurrently, against a single app instance.
    const responses = await Promise.all(
      Array.from({ length: 101 }, () => request(app).get('/api/health')),
    );

    const limited = responses.filter((res) => res.status === 429);
    expect(limited.length).toBeGreaterThan(0);
    expect(limited[0]?.body).toEqual({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
    });
  });
});
