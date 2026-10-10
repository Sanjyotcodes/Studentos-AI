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

  'tint-coral': 'hsl(var(--tint-coral))',
  'tint-coral-foreground': 'hsl(var(--tint-coral-foreground))',
  'tint-teal': 'hsl(var(--tint-teal))',
  'tint-teal-foreground': 'hsl(var(--tint-teal-foreground))',
  'tint-amber': 'hsl(var(--tint-amber))',
  'tint-amber-foreground': 'hsl(var(--tint-amber-foreground))',
  'tint-purple': 'hsl(var(--tint-purple))',
  'tint-purple-foreground': 'hsl(var(--tint-purple-foreground))',

  // Decorative brand gradient stops. HSL channels like everything above, so
  // Tailwind's opacity modifiers (`bg-brand-pink/30`) still work.
  // Expressive by design — never use these to encode a value.
  'brand-coral': 'hsl(var(--brand-coral))',
  'brand-pink': 'hsl(var(--brand-pink))',
  'brand-violet': 'hsl(var(--brand-violet))',
  'brand-cyan': 'hsl(var(--brand-cyan))',

  // Data-viz tokens. Deliberately NOT hsl()-wrapped: these are stored as
  // literal hex in globals.css because they're validator output, and
  // round-tripping them through HSL channels would invite someone to "tidy"
  // a number that was chosen by measurement. The cost is that Tailwind's
  // `/opacity` modifier doesn't apply to them — which is correct, since a
  // faded data mark no longer means what its validated color meant.
  'viz-1': 'var(--viz-1)',
  'viz-2': 'var(--viz-2)',
  'viz-3': 'var(--viz-3)',
  'viz-4': 'var(--viz-4)',
  'viz-5': 'var(--viz-5)',
  'viz-6': 'var(--viz-6)',
  'viz-7': 'var(--viz-7)',
  'viz-8': 'var(--viz-8)',

  'status-good': 'var(--status-good)',
  'status-warning': 'var(--status-warning)',
  'status-serious': 'var(--status-serious)',
  'status-critical': 'var(--status-critical)',

  'viz-track': 'hsl(var(--viz-track))',
  'viz-grid': 'hsl(var(--viz-grid))',
} as const;

// The fixed categorical order, as CSS-variable references. Index = slot - 1.
// Assigned in fixed order and never cycled: a 9th series must fold into
// "Other" rather than wrap back to slot 1 (dataviz: non-negotiables).
export const VIZ_CATEGORICAL = [
  'var(--viz-1)',
  'var(--viz-2)',
  'var(--viz-3)',
  'var(--viz-4)',
  'var(--viz-5)',
  'var(--viz-6)',
  'var(--viz-7)',
  'var(--viz-8)',
] as const;
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
  // Entrance/reveal animations — long enough to read as deliberate motion
  // rather than a glitch, short enough not to delay the content.
  reveal: 480,
} as const;

export const transitionDuration = {
  fast: `${duration.fast}ms`,
  base: `${duration.base}ms`,
  slow: `${duration.slow}ms`,
  reveal: `${duration.reveal}ms`,
} as const;

// Framer Motion spring presets, shared so every interactive surface in the
// app springs with the same personality instead of each component inventing
// its own stiffness.
export const spring = {
  // Snappy — buttons, taps, small toggles.
  snappy: { type: 'spring', stiffness: 420, damping: 28, mass: 0.7 },
  // Soft — cards lifting, panels settling.
  soft: { type: 'spring', stiffness: 220, damping: 26, mass: 0.9 },
  // Bouncy — celebratory accents only; too lively for routine UI.
  bouncy: { type: 'spring', stiffness: 360, damping: 15, mass: 0.8 },
} as const;
