'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { RequireAuth } from '@/modules/auth/components/RequireAuth';
import { useSidebarStore } from '@/stores/useSidebarStore';
import { pageTransition } from '@/lib/motion';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setMobileOpen] = useState(false);
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);
  const pathname = usePathname();

  return (
    <RequireAuth>
      {/* No background color here: the root-level AuroraBackground is what
          paints the page, and an opaque plane at this level would hide it. */}
      <div className="min-h-screen overflow-x-hidden">
        <Sidebar isMobileOpen={isMobileOpen} onCloseMobile={() => setMobileOpen(false)} />

        <div
          className={cn(
            'flex min-h-screen flex-col transition-[margin] duration-base ease-in-out',
            'md:ml-sidebar-width',
            isCollapsed && 'md:ml-sidebar-width-collapsed',
          )}
        >
          <Navbar onOpenMobileMenu={() => setMobileOpen(true)} />
          <main className="flex-1 overflow-x-hidden p-4 md:p-6">
            {/* Keyed on pathname so each route change replays the entrance
                instead of swapping content in place. */}
            <motion.div
              key={pathname}
              variants={pageTransition}
              initial="hidden"
              animate="visible"
              className="mx-auto w-full max-w-5xl"
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </RequireAuth>
  );
}
