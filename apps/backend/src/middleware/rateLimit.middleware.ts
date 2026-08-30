// Global request rate limiter. Exported as a factory (not a module-level
// singleton) so every createApp() call gets its own independent counter —
// this matters for tests, which build a fresh app per test to stay isolated
// from each other, and is harmless in production, where createApp() is only
// ever called once at server startup.
//
// Limits are a conservative, one-size-fits-all default for now; Phase 15
// ("hardening & deploy") is where per-route-class tuning happens.
import type { Request } from 'express';
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import { TooManyRequestsError } from '../errors/AppError';

interface RateLimiterOptions {
  windowMs?: number;
  max?: number;
  // Overriding this is what makes a limiter per-user instead of the default
  // per-IP — the AI routes need this (T10.9), since Anthropic calls carry
  // real marginal cost per user, not per network address.
  keyGenerator?: (req: Request) => string;
}

export function createRateLimiter(options: RateLimiterOptions = {}): RateLimitRequestHandler {
  return rateLimit({
    windowMs: options.windowMs ?? 15 * 60 * 1000,
    max: options.max ?? 100,
    standardHeaders: true,
    legacyHeaders: false,
    ...(options.keyGenerator ? { keyGenerator: options.keyGenerator } : {}),
    handler: (_req, _res, next) => {
      next(new TooManyRequestsError());
    },
  });
}
