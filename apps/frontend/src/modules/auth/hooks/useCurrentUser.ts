'use client';

import type { User } from '@studentos/shared';
import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '@/modules/auth/api/auth.api';

// Shared by every hook in this module that needs to read or update the
// current-user cache entry (login/register seed it, logout clears it, the
// route guards read it).
export const authMeQueryKey = ['auth', 'me'] as const;

interface UseCurrentUserOptions {
  // Callers that already know there's no session to check (no stored
  // token) pass `enabled: false` so this never fires a doomed request.
  enabled?: boolean;
}

export function useCurrentUser(options: UseCurrentUserOptions = {}) {
  return useQuery<User>({
    queryKey: authMeQueryKey,
    queryFn: getCurrentUser,
    enabled: options.enabled ?? true,
    retry: false,
    staleTime: 60_000,
  });
}
