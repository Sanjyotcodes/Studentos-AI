// Phase 15 (T15.7): logs redact passwords, tokens, and the Gemini key.
// Exercises the logger directly rather than through a real request — the
// request logger deliberately never logs request bodies (see
// requestLogger.middleware.ts), so this is what actually demonstrates the
// redaction guarantee holds for any metadata that legitimately does flow
// through logs (e.g. error context a future call site might add).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from '../config/env';
import { logger } from './logger';

describe('T15.7: logs redact passwords, tokens, and the Gemini key', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redacts a field literally named password/token/apiKey by key', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    logger.info('user action', {
      password: 'super-secret-password',
      token: 'abc.def.ghi',
      apiKey: 'some-key-value',
    });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const line = consoleSpy.mock.calls[0]![0] as string;
    expect(line).not.toContain('super-secret-password');
    expect(line).not.toContain('abc.def.ghi');
    expect(line).not.toContain('some-key-value');
    expect(line).toContain('[REDACTED]');
  });

  it("redacts the process's real GEMINI_API_KEY value wherever it appears, even nested and unlabeled", () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    logger.error('upstream call failed', {
      // Not under a "secret"-shaped key — simulates the key leaking into an
      // arbitrary nested field (e.g. an echoed request URL/config), which
      // only the final substring pass (not key-based redaction) can catch.
      debugContext: { requestUrl: `https://example.com/v1?key=${env.GEMINI_API_KEY}` },
    });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const line = consoleSpy.mock.calls[0]![0] as string;
    expect(line).not.toContain(env.GEMINI_API_KEY);
    expect(line).toContain('[REDACTED]');
  });

  it('redacts JWT signing secrets wherever they appear', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    logger.warn('token verification note', {
      detail: `signed with ${env.JWT_ACCESS_SECRET} and refreshed via ${env.JWT_REFRESH_SECRET}`,
    });

    const line = consoleSpy.mock.calls[0]![0] as string;
    expect(line).not.toContain(env.JWT_ACCESS_SECRET);
    expect(line).not.toContain(env.JWT_REFRESH_SECRET);
  });

  it('does not redact ordinary, non-sensitive fields', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    logger.info('request completed', { method: 'GET', path: '/api/tasks', statusCode: 200 });

    const line = consoleSpy.mock.calls[0]![0] as string;
    expect(line).toContain('/api/tasks');
    expect(line).toContain('200');
  });
});
