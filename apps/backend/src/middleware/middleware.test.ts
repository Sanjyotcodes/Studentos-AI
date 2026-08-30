// Phase 4 (T4.1–T4.4): exercises the real error-handling and validation
// middleware end-to-end over HTTP, using a minimal test-only Express app that
// wires up the same production modules (no feature routes involved — this is
// generic plumbing, not a feature module, so it doesn't conflict with this
// phase's Non-goals).
import express, { type Express } from 'express';
import request from 'supertest';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { BadRequestError, NotFoundError } from '../errors/AppError';
import { errorMiddleware } from './error.middleware';
import { validate } from './validate.middleware';

function buildTestApp(): Express {
  const app = express();
  app.use(express.json());

  app.get('/throws-not-found', (_req, _res, next) => {
    next(new NotFoundError('Widget not found'));
  });

  app.get('/throws-plain-error', () => {
    throw new Error('boom: something internal broke, with a secret stack trace');
  });

  const testSchema = z.object({
    name: z.string().min(1, 'name is required'),
    count: z.coerce.number(),
  });

  app.post('/validated', validate(testSchema), (req, res) => {
    res.status(200).json({ success: true, data: req.body });
  });

  app.use(errorMiddleware);
  return app;
}

describe('errorMiddleware (T4.1, T4.2)', () => {
  it('T4.1: an AppError (NotFoundError) becomes HTTP 404 with the standard envelope', async () => {
    const res = await request(buildTestApp()).get('/throws-not-found');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Widget not found' },
    });
  });

  it('T4.2: an unknown Error becomes HTTP 500 with a generic message and no stack trace', async () => {
    const res = await request(buildTestApp()).get('/throws-plain-error');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
    });
    const bodyText = JSON.stringify(res.body);
    expect(bodyText).not.toContain('boom');
    expect(bodyText).not.toContain('secret stack trace');
    expect(bodyText.toLowerCase()).not.toContain('.ts:');
  });
});

describe('validate middleware (T4.3, T4.4)', () => {
  it('T4.3: an invalid body returns HTTP 400 listing the offending field', async () => {
    const res = await request(buildTestApp())
      .post('/validated')
      .send({ name: '', count: 'not-a-number' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toContain('name');
    expect(paths).toContain('count');
  });

  it('T4.4: a valid body passes through with values coerced (numeric string -> number)', async () => {
    const res = await request(buildTestApp())
      .post('/validated')
      .send({ name: 'widget', count: '42' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ name: 'widget', count: 42 });
    expect(typeof res.body.data.count).toBe('number');
  });
});

// Sanity check that BadRequestError itself carries the expected shape, since
// the validate-middleware tests above only exercise it indirectly via HTTP.
describe('BadRequestError', () => {
  it('defaults to a 400 status and BAD_REQUEST code', () => {
    const err = new BadRequestError('nope');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
  });
});
