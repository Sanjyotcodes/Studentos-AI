'use client';

import {
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ListTodo,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useSidebarStore } from '@/stores/useSidebarStore';
import { spring } from '@/styles/design-tokens';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { href: '/timetable', label: 'Timetable', icon: CalendarDays },
  { href: '/tasks', label: 'Tasks', icon: ListTodo },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/planner', label: 'Planner', icon: CalendarRange },
  { href: '/grades', label: 'Grades', icon: GraduationCap },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ isMobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { isCollapsed, toggle } = useSidebarStore();

  return (
    <>
      {/* Mobile scrim — closes the drawer on outside tap */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border/60',
          'bg-card/70 backdrop-blur-xl',
          'transition-all duration-base ease-in-out',
          'w-sidebar-width',
          isCollapsed && 'md:w-sidebar-width-collapsed',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="flex h-navbar-height items-center justify-between border-b border-border/60 px-4">
          {!isCollapsed && (
            <Link href="/" className="flex min-w-0 items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-brand-coral" aria-hidden="true" />
              <span className="text-gradient text-gradient-animated truncate text-sm font-bold tracking-tight">
                StudentOS AI
              </span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onCloseMobile}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex"
            onClick={toggle}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                  'transition-colors duration-fast',
                  isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                  isCollapsed && 'md:justify-center',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* The active pill is one shared element: `layoutId` makes
                    Framer animate it *between* nav items on route change
                    rather than cross-fading two separate pills. */}
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-pill"
                    transition={spring.soft}
                    className="absolute inset-0 -z-10 rounded-md bg-gradient-to-r from-brand-coral to-brand-pink
                               shadow-[0_4px_14px_-4px_hsl(var(--brand-coral)/0.6)]"
                  />
                )}
                {/* Hover wash for inactive items, under the pill either way. */}
                {!isActive && (
                  <span className="absolute inset-0 -z-10 rounded-md bg-accent opacity-0 transition-opacity duration-fast group-hover:opacity-100" />
                )}

                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-transform duration-base',
                    'group-hover:scale-110',
                  )}
                />
                <span className={cn(isCollapsed && 'md:hidden')}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
