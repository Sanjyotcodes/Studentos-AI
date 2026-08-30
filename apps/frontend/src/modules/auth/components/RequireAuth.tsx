'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { ApiClientError, hasStoredSession } from '@/lib/api-client';
import { useCurrentUser } from '@/modules/auth/hooks/useCurrentUser';

// Gates every route under (dashboard). Renders nothing but a neutral loading
// screen until we have a definitive answer — never the dashboard content,
// never a bounce to /login, while that answer is still pending. That's what
// keeps a real session from ever flashing the login screen (T8.5) and what
// keeps a missing/expired one from ever flashing the dashboard first.
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // localStorage doesn't exist during SSR, so the very first client render
  // must match the server's — render the same loading screen on both sides
  // and only consult storage after mount (same pattern as Navbar's theme
  // icon in Phase 7).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const hasSession = mounted && hasStoredSession();
  const { data: user, isError, error } = useCurrentUser({ enabled: hasSession });

  // Latched, not read live off the query: a query that has never succeeded
  // refetches on every new observer mount (e.g. a page that also reads the
  // current user for its own display), which flips isLoading/isError back
  // and forth for as long as the backend stays down (T9.12). Reading those
  // flags directly would hide {children} again on every pulse, unmounting
  // whatever page just mounted — which is itself a new observer, retriggering
  // another refetch, forever. Latching means once we've resolved (success or
  // error) even once, we stay resolved regardless of later background pulses.
  const [settled, setSettled] = useState(false);
  const [confirmedLoggedOut, setConfirmedLoggedOut] = useState(false);
  useEffect(() => {
    if (user) {
      setSettled(true);
    }
    if (isError) {
      setSettled(true);
      if (error instanceof ApiClientError && error.code === 'UNAUTHORIZED') {
        setConfirmedLoggedOut(true);
      }
    }
  }, [user, isError, error]);

  const definitelyLoggedOut = mounted && (!hasSession || confirmedLoggedOut);

  useEffect(() => {
    if (definitelyLoggedOut) {
      router.replace('/login');
    }
  }, [definitelyLoggedOut, router]);

  if (!mounted) {
    return <LoadingScreen />;
  }
  if (hasSession && !settled) {
    return <LoadingScreen />;
  }
  if (definitelyLoggedOut) {
    // Mid-redirect (the effect above just fired) — show the loading screen
    // rather than a flash of empty dashboard chrome.
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
