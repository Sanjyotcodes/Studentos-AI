// Phase 15 (T15.6, T15.8): the real, fully-assembled app never leaks a stack
// trace, SQL text, or a file path in an error response, and an oversized
// request body is rejected with 413 rather than a generic 500 — both via
// errorMiddleware.ts's non-AppError HTTP-status handling.
import express, { type Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorMiddleware } from './error.middleware';

describe('T15.8: an oversized request body is rejected with 413', () => {
  it('a JSON body over the 100kb limit returns 413 in the standard envelope, not 500', async () => {
    const { createApp } = await import('../app');
    const app = createApp();

    // ~150kb of payload, comfortably over the 100kb express.json() limit set in app.ts.
    const oversizedPassword = 'a'.repeat(150_000);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'oversized@studentos-test.dev', password: oversizedPassword });

    expect(res.status).toBe(413);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large.' },
    });
    // body-parser's own error text/stack must never reach the client.
    const bodyText = JSON.stringify(res.body).toLowerCase();
    expect(bodyText).not.toContain('request entity too large');
    expect(bodyText).not.toContain('.ts:');
    expect(bodyText).not.toContain('at ');
  });
});

describe('T15.6: production error responses contain no stack traces, SQL text, or file paths', () => {
  function buildAppWithThrowingRoute(): Express {
    const app = express();
    app.use(express.json());

    app.get('/throws-plain-error', () => {
      throw new Error(
        'boom at D:\\projects\\ai-student-assitiant\\apps\\backend\\src\\secret-file.ts:42:7',
      );
    });

    // Simulates an unmapped Prisma error reaching the middleware unwrapped —
    // Prisma's real P2002 message shape includes the table/column, which
    // must never be forwarded to the client even if a future code path
    // forgets to pre-check a constraint before insert.
    app.get('/throws-prisma-like-error', () => {
      throw new Error(
        'Unique constraint failed on the fields: (`email`) SELECT * FROM "User" WHERE email = $1',
      );
    });

    app.use(errorMiddleware);
    return app;
  }

  it('a plain Error with a file path and line number never leaks its message', async () => {
    const res = await request(buildAppWithThrowingRoute()).get('/throws-plain-error');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
    });
    const bodyText = JSON.stringify(res.body).toLowerCase();
    expect(bodyText).not.toContain('secret-file');
    expect(bodyText).not.toContain('.ts:');
    expect(bodyText).not.toContain('d:\\');
  });

  it('a Prisma-shaped error (table/column/SQL text in its message) never leaks its message', async () => {
    const res = await request(buildAppWithThrowingRoute()).get('/throws-prisma-like-error');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
    });
    const bodyText = JSON.stringify(res.body).toUpperCase();
    expect(bodyText).not.toContain('SELECT');
    expect(bodyText).not.toContain('UNIQUE CONSTRAINT');
    expect(bodyText).not.toContain('"USER"');
  });
});
