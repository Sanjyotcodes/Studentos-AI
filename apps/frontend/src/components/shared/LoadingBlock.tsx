import { Loader2 } from 'lucide-react';

// In-page loading state for a single data surface (as opposed to
// LoadingScreen, which is a full-viewport gate used only by RequireAuth).
export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-lg border border-border px-6 py-12 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
