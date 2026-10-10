import { Sparkles } from 'lucide-react';
import { RequireGuest } from '@/modules/auth/components/RequireGuest';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireGuest>
      {/* No bg-* here — the root AuroraBackground paints the page, and the
          auth screens are where it's most visible. */}
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <div className="mb-7 flex flex-col items-center gap-2 text-center">
          <span className="animate-float-slow flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-coral to-brand-pink shadow-[0_8px_28px_-8px_hsl(var(--brand-coral)/0.75)]">
            <Sparkles className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
          </span>
          <h1 className="text-gradient text-gradient-animated text-2xl font-bold tracking-tight">
            StudentOS AI
          </h1>
          <p className="max-w-xs text-sm text-muted-foreground">
            Attendance, tasks, notes and an AI that actually knows your semester.
          </p>
        </div>

        <div className="w-full max-w-sm">{children}</div>
      </div>
    </RequireGuest>
  );
}
