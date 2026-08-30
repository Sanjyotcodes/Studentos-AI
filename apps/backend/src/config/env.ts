// Environment variable loading and validation (Zod-parsed, fail fast on boot).
import 'dotenv/config';
import { z } from 'zod';

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

const requiredString = (name: string) =>
  z.preprocess(
    emptyToUndefined,
    z.string({ required_error: `${name} is required` }).min(1, `${name} is required`),
  );

const envSchema = z.object({
  NODE_ENV: z.preprocess(
    emptyToUndefined,
    z.enum(['development', 'test', 'production']).default('development'),
  ),
  PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(4000)),
  DATABASE_URL: requiredString('DATABASE_URL'),
  JWT_ACCESS_SECRET: requiredString('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: requiredString('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: z.preprocess(emptyToUndefined, z.string().default('15m')),
  JWT_REFRESH_EXPIRES_IN: z.preprocess(emptyToUndefined, z.string().default('7d')),
  GEMINI_API_KEY: requiredString('GEMINI_API_KEY'),
  CORS_ORIGIN: requiredString('CORS_ORIGIN'),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    // eslint-disable-next-line no-console
    console.error(`Invalid environment configuration:\n${details}`);
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;