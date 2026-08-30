// Design tokens — the single source `tailwind.config.ts` extends its theme
// from. Two different wiring strategies, by necessity:
//
// - Colors change between light and dark, so the actual HSL numbers live as
//   CSS custom properties in globals.css (`:root` / `.dark`) — that's what
//   makes runtime theme switching possible at all. The `colors` export below
//   is not a second copy of those numbers; it's the map of semantic name ->
//   CSS-variable reference that tailwind.config.ts consumes directly, so the
//   variable *names* still only exist in one place (this file).
// - Spacing/radius/type-scale/motion don't change between themes, so they're
//   plain values here, imported directly into tailwind.config.ts.

export const colors = {
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  card: 'hsl(var(--card))',
  'card-foreground': 'hsl(var(--card-foreground))',
  popover: 'hsl(var(--popover))',
  'popover-foreground': 'hsl(var(--popover-foreground))',
  primary: 'hsl(var(--primary))',
  'primary-foreground': 'hsl(var(--primary-foreground))',
  secondary: 'hsl(var(--secondary))',
  'secondary-foreground': 'hsl(var(--secondary-foreground))',
  muted: 'hsl(var(--muted))',
  'muted-foreground': 'hsl(var(--muted-foreground))',
  accent: 'hsl(var(--accent))',
  'accent-foreground': 'hsl(var(--accent-foreground))',
  destructive: 'hsl(var(--destructive))',
  'destructive-foreground': 'hsl(var(--destructive-foreground))',
  border: 'hsl(var(--border))',
  input: 'hsl(var(--input))',
  ring: 'hsl(var(--ring))',
} as const;

// Semantic spacing aliases layered on top of Tailwind's default numeric
// scale (via `extend`, so `p-4` etc. still work) — for the handful of
// layout constants (sidebar width, navbar height) that want a name, not a
// magic number.
export const spacing = {
  'sidebar-width': '16rem',
  'sidebar-width-collapsed': '4.5rem',
  'navbar-height': '3.5rem',
} as const;

// Mirrors the shadcn/ui convention: a single base radius, with sm/md/lg
// derived from it so component variants stay visually consistent.
export const radius = {
  sm: 'calc(var(--radius) - 4px)',
  md: 'calc(var(--radius) - 2px)',
  lg: 'var(--radius)',
  xl: 'calc(var(--radius) + 4px)',
} as const;

// Not `as const` — Tailwind's Config type expects mutable string[]/tuple
// values here, and a readonly tuple isn't assignable to that even though the
// values themselves never change at runtime.
export const fontFamily: Record<string, string[]> = {
  sans: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Inter',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ],
};

// [fontSize, lineHeight] pairs, matching Tailwind's fontSize extension shape.
export const fontSize: Record<string, [string, string]> = {
  xs: ['0.75rem', '1rem'],
  sm: ['0.875rem', '1.25rem'],
  base: ['1rem', '1.5rem'],
  lg: ['1.125rem', '1.75rem'],
  xl: ['1.25rem', '1.75rem'],
  '2xl': ['1.5rem', '2rem'],
  '3xl': ['1.875rem', '2.25rem'],
};

// Milliseconds — for Framer Motion's `duration` prop (seconds = duration/1000)
// and for the matching Tailwind `transitionDuration` scale below.
export const duration = {
  fast: 150,
  base: 200,
  slow: 300,
} as const;

export const transitionDuration = {
  fast: `${duration.fast}ms`,
  base: `${duration.base}ms`,
  slow: `${duration.slow}ms`,
} as const;
