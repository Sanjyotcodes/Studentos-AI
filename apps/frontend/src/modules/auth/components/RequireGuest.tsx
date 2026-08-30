'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { hasStoredSession } from '@/lib/api-client';
import { useCurrentUser } from '@/modules/auth/hooks/useCurrentUser';

// Gates every route under (auth) — the mirror image of RequireAuth. An
// already-authenticated visitor to /login or /register is bounced to the
// dashboard (T8.7) instead of being shown the form again.
export function RequireGuest({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const hasSession = mounted && hasStoredSession();
  const { data: user, isLoading } = useCurrentUser({ enabled: hasSession });

  const definitelyAuthenticated = mounted && hasSession && Boolean(user);

  useEffect(() => {
    if (definitelyAuthenticated) {
      router.replace('/');
    }
  }, [definitelyAuthenticated, router]);

  if (!mounted) {
    return <LoadingScreen />;
  }
  if (hasSession && isLoading) {
    return <LoadingScreen />;
  }
  if (definitelyAuthenticated) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
