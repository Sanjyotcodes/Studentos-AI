'use client';

import type { AuthResponse, LoginInput } from '@studentos/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { setTokens } from '@/lib/api-client';
import { login } from '@/modules/auth/api/auth.api';
import { authMeQueryKey } from '@/modules/auth/hooks/useCurrentUser';

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<AuthResponse, Error, LoginInput>({
    mutationFn: login,
    onSuccess: (data) => {
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      // Seed the cache with what we already have — RequireAuth/RequireGuest
      // read from here too, so this avoids an extra round trip to /auth/me
      // immediately after login.
      queryClient.setQueryData(authMeQueryKey, data.user);
      // replace, not push — a logged-in user pressing "back" from the
      // dashboard should not land back on the login form (see T8.8's sibling
      // requirement for logout, applied symmetrically here).
      router.replace('/');
    },
  });
}
