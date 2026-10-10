'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLogout } from '@/modules/auth/hooks/useLogout';
import { spring } from '@/styles/design-tokens';

interface NavbarProps {
  onOpenMobileMenu: () => void;
}

export function Navbar({ onOpenMobileMenu }: NavbarProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const logout = useLogout();
  // next-themes only knows the real theme after mount (it reads
  // localStorage/media-query client-side) — render a stable placeholder
  // icon until then rather than guessing, to avoid a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-30 flex h-navbar-height items-center justify-between border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/45">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onOpenMobileMenu}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle dark mode"
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      >
        {/* The icon swap gets a rotate+fade so the theme toggle feels like a
            switch being thrown rather than a glyph being replaced. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={mounted && resolvedTheme === 'dark' ? 'sun' : 'moon'}
            initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
            transition={spring.snappy}
            className="flex items-center justify-center"
          >
            {mounted && resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4 text-brand-coral" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </motion.span>
        </AnimatePresence>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Log out"
        disabled={logout.isPending}
        onClick={() => logout.mutate()}
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </header>
  );
}
