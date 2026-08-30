'use client';

import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes';

// Thin re-export so app code imports one "providers" surface rather than
// reaching into next-themes directly — keeps the theming implementation
// swappable without touching layout.tsx.
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
