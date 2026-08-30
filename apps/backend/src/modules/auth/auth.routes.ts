// Auth route definitions (register, login, refresh, logout, me).
import { loginSchema, refreshTokenSchema, registerSchema } from '@studentos/shared';
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { createRateLimiter } from '../../middleware/rateLimit.middleware';
import { validate } from '../../middleware/validate.middleware';
import * as authController from './auth.controller';

export const authRouter = Router();

// Auth is its own rate-limit class (Phase 15): credential-stuffing and
// brute-force attempts target register/login specifically, so this is
// tighter per-IP than the general CRUD default (rateLimit.middleware.ts's
// 100/15min) — 30/15min per IP is still generous enough for the heaviest
// integration test file's ~17 registrations against one shared app instance,
// with headroom for future tests, while meaningfully capping real abuse.
authRouter.use(createRateLimiter({ windowMs: 15 * 60 * 1000, max: 30 }));

authRouter.post('/register', validate(registerSchema), authController.register);
authRouter.post('/login', validate(loginSchema), authController.login);
authRouter.post('/refresh', validate(refreshTokenSchema), authController.refresh);
authRouter.post('/logout', validate(refreshTokenSchema), authController.logout);
authRouter.get('/me', requireAuth, authController.me);
