import { RequireGuest } from '@/modules/auth/components/RequireGuest';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireGuest>
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </RequireGuest>
  );
}
