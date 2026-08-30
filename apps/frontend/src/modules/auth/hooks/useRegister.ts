'use client';

import type { AuthResponse, RegisterInput } from '@studentos/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { setTokens } from '@/lib/api-client';
import { register } from '@/modules/auth/api/auth.api';
import { authMeQueryKey } from '@/modules/auth/hooks/useCurrentUser';

export function useRegister() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<AuthResponse, Error, RegisterInput>({
    mutationFn: register,
    onSuccess: (data) => {
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      queryClient.setQueryData(authMeQueryKey, data.user);
      router.replace('/');
    },
  });
}
