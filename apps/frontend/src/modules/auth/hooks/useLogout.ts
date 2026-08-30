'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { clearTokens, getRefreshToken } from '@/lib/api-client';
import { logout } from '@/modules/auth/api/auth.api';
import { authMeQueryKey } from '@/modules/auth/hooks/useCurrentUser';

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await logout(refreshToken);
      }
    },
    // Clear local session state and redirect even if the server call
    // fails (e.g. the token was already revoked) — the user's intent is to
    // be logged out locally regardless.
    onSettled: () => {
      clearTokens();
      queryClient.setQueryData(authMeQueryKey, null);
      queryClient.removeQueries({ queryKey: authMeQueryKey });
      // replace — the dashboard entry should not be reachable via "back"
      // after logout (T8.8).
      router.replace('/login');
    },
  });
}
