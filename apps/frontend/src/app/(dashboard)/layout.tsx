'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { RequireAuth } from '@/modules/auth/components/RequireAuth';
import { useSidebarStore } from '@/stores/useSidebarStore';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setMobileOpen] = useState(false);
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);

  return (
    <RequireAuth>
      <div className="min-h-screen overflow-x-hidden bg-background">
        <Sidebar isMobileOpen={isMobileOpen} onCloseMobile={() => setMobileOpen(false)} />

        <div
          className={cn(
            'flex min-h-screen flex-col transition-[margin] duration-base ease-in-out',
            'md:ml-sidebar-width',
            isCollapsed && 'md:ml-sidebar-width-collapsed',
          )}
        >
          <Navbar onOpenMobileMenu={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}
