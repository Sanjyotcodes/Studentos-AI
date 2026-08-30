// Structured (JSON) logging with two layers of redaction (Phase 15, T15.7):
// known-sensitive object keys are masked by name, and every log line also
// gets a final substring pass for the process's own live secret values
// (JWT signing secrets, the Gemini key) — so a secret is scrubbed even if it
// surfaces somewhere a key-based check wouldn't catch (e.g. embedded inside
// a nested error message or a nested error object's own fields).
import { env } from '../config/env';

type LogLevel = 'info' | 'warn' | 'error';
export type LogMeta = Record<string, unknown>;

// Only non-empty values are ever scanned for — an empty string would match
// (and redact) everything.
const SECRET_VALUES = [env.GEMINI_API_KEY, env.JWT_ACCESS_SECRET, env.JWT_REFRESH_SECRET].filter(
  (value): value is string => Boolean(value),
);

const REDACTED_KEYS = new Set([
  'password',
  'newpassword',
  'currentpassword',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'apikey',
  'gemini_api_key',
  'secret',
]);

const REDACTED = '[REDACTED]';

function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return redactString(value);
  }
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (value && typeof value === 'object') {
    return redactObject(value as LogMeta);
  }
  return value;
}

function redactString(value: string): string {
  let result = value;
  for (const secret of SECRET_VALUES) {
    if (result.includes(secret)) {
      result = result.split(secret).join(REDACTED);
    }
  }
  return result;
}

function redactObject(obj: LogMeta): LogMeta {
  const result: LogMeta = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = REDACTED_KEYS.has(key.toLowerCase()) ? REDACTED : redactValue(value);
  }
  return result;
}

function write(level: LogLevel, message: string, meta?: LogMeta): void {
  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...(meta ? redactObject(meta) : {}),
  };
  // Final pass over the fully-serialized line — belt-and-suspenders in case a
  // secret value ended up somewhere the key-based redaction above couldn't
  // reach (e.g. concatenated into a longer string rather than its own field).
  const line = redactString(JSON.stringify(entry));
  // eslint-disable-next-line no-console
  console[level === 'info' ? 'log' : level](line);
}

export const logger = {
  info: (message: string, meta?: LogMeta) => write('info', message, meta),
  warn: (message: string, meta?: LogMeta) => write('warn', message, meta),
  error: (message: string, meta?: LogMeta) => write('error', message, meta),
};
