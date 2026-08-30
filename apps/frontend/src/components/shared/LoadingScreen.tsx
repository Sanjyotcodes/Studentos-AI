import { Loader2 } from 'lucide-react';

// A neutral, theme-aware placeholder shown while route guards are deciding
// where a visitor belongs (checking a stored session, waiting for a
// redirect to resolve). Deliberately content-free — showing this instead of
// guessing "logged out" or "logged in" is what keeps T8.5 from ever
// flashing the wrong screen.
export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  );
}
