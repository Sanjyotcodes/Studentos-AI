// Assigns a per-request id (propagated as the X-Request-Id response header
// so a client/support ticket can correlate with server logs) and logs one
// structured line per completed request via lib/logger.ts (Phase 15).
// Deliberately does NOT log the request body — user content (note text,
// task titles, etc.) isn't a "secret" per T15.7 but still shouldn't be
// blanket-logged; the logger's redaction exists for the fields that do
// legitimately need to flow through logs (e.g. error metadata), not as a
// license to log everything.
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { logger } from '../lib/logger';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);

  // Quiet during tests — noisy per-request logs add nothing to test output.
  // The request id and response header above are still always set.
  if (env.NODE_ENV === 'test') {
    next();
    return;
  }

  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    logger.info('request completed', {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs),
    });
  });

  next();
}
