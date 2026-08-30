// Typecheck-only proof that @studentos/shared resolves from the frontend workspace (Phase 1, T1.7).
// No runtime behavior — real usage of these shapes belongs to the feature phases that consume them.
import type { ApiResponse } from '@studentos/shared';

export type SharedResolvesCheck = ApiResponse<unknown>;
