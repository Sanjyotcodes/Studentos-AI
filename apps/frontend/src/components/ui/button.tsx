import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // `active:scale-[0.97]` gives every button a physical press without needing
  // Framer on each one — it's a transform, so the reduced-motion rule in
  // globals.css neutralizes it along with everything else.
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ' +
    'transition-all duration-fast active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 ' +
    'focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
    'disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // The brand gradient + a colored shadow that reads as the button
        // glowing against the glass, rather than a flat fill.
        default:
          'bg-gradient-to-r from-brand-coral via-brand-coral to-brand-pink text-primary-foreground ' +
          'shadow-[0_4px_16px_-4px_hsl(var(--brand-coral)/0.55)] hover:brightness-110 ' +
          'hover:shadow-[0_6px_22px_-4px_hsl(var(--brand-coral)/0.7)]',
        // A toggle that is currently ON. Deliberately flat — no gradient, no
        // glow — because `default` is the page's call-to-action treatment and
        // a row of selected toggles wearing it reads as a row of CTAs.
        selected: 'bg-primary text-primary-foreground shadow-none hover:bg-primary',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-border bg-card/60 backdrop-blur hover:border-brand-coral/50 ' +
          'hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
