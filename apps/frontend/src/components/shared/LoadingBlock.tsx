import { Loader2 } from 'lucide-react';

// In-page loading state for a single data surface (as opposed to
// LoadingScreen, which is a full-viewport gate used only by RequireAuth).
// The shimmer sweep gives waiting a sense of progress; the spinner and label
// remain the actual status, so nothing is conveyed by the animation alone.
export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="glass shimmer relative flex items-center justify-center gap-2 overflow-hidden rounded-lg px-6 py-12 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin text-brand-coral" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
