// Express application assembly: middleware, route mounting, error handler.
import cors, { type CorsOptions } from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { ForbiddenError, NotFoundError } from './errors/AppError';
import { errorMiddleware } from './middleware/error.middleware';
import { createRateLimiter } from './middleware/rateLimit.middleware';
import { requestLogger } from './middleware/requestLogger.middleware';
import { apiRouter } from './routes';

// CORS_ORIGIN accepts one or more comma-separated origins — a single value
// works unchanged (no comma = a one-element list), while a real deploy can
// list e.g. a production domain plus preview-deployment URLs without code
// changes (Phase 15 hardening pass).
const allowedOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // No Origin header at all means a non-browser client (curl, server-to-server,
    // the health check) — those aren't subject to CORS, so let them through.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new ForbiddenError('Origin not allowed by CORS'));
  },
};

export function createApp(): Express {
  const app = express();

  // helmet()'s defaults (hides X-Powered-By, sets HSTS/frame-options/no-sniff/
  // etc.) are appropriate as-is for this API: every response is JSON, never
  // HTML, so there's no injectable-markup surface a custom CSP would need to
  // restrict (Phase 15 security-header review).
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(createRateLimiter());

  // Assigns req.requestId and the X-Request-Id response header on every
  // request; the structured completion log line itself is skipped in test
  // env (see requestLogger.middleware.ts) — noisy per-request logs add
  // nothing to test output, but the id itself stays available for error
  // logging and for the header to be tested.
  app.use(requestLogger);

  app.use(express.json({ limit: '100kb' }));
  app.use('/api', apiRouter);

  // Anything not matched by apiRouter falls through to here.
  app.use((_req, _res, next) => {
    next(new NotFoundError('Route not found'));
  });

  // Must be registered last — it is the only file allowed to format an error response.
  app.use(errorMiddleware);

  return app;
}
