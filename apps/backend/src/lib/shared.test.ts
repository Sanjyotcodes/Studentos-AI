// Phase 1 (T1.6): proves @studentos/shared resolves and works from the backend workspace.
// Not a real feature test — those land in each module's own test file in later phases.
import { describe, expect, it } from 'vitest';
import { registerSchema } from '@studentos/shared';

describe('@studentos/shared import', () => {
  it('resolves the registerSchema symbol and validates a payload', () => {
    const result = registerSchema.safeParse({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'correct-horse',
    });

    expect(result.success).toBe(true);
  });
});
