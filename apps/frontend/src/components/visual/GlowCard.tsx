'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { useCallback, useRef } from 'react';
import { spring } from '@/styles/design-tokens';
import { cn } from '@/lib/utils';

interface GlowCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  /** Lift the card on hover. Off for static/among-many surfaces. */
  lift?: boolean;
  /** Paint the gradient hairline ring. Reserve for emphasis surfaces. */
  gradientRing?: boolean;
  // Narrowed from Framer's own children type, which also admits MotionValue.
  // This card renders its children inside a plain <div> wrapper (to sit above
  // the spotlight layer), and a MotionValue isn't valid ReactNode there.
  children?: React.ReactNode;
}

/**
 * A glass card that tracks the pointer with a soft radial spotlight.
 *
 * The spotlight is driven by two CSS custom properties rather than React
 * state: a `mousemove` on a card would otherwise re-render the subtree on
 * every pointer frame. Writing `--spot-x/--spot-y` straight onto the node
 * keeps the effect entirely in the compositor, and the gradient itself lives
 * in the `.spotlight` class in globals.css.
 */
export function GlowCard({
  className,
  lift = true,
  gradientRing = false,
  children,
  ...props
}: GlowCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
    node.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
  }, []);

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      whileHover={lift ? { y: -4 } : undefined}
      transition={spring.soft}
      className={cn(
        'glass spotlight relative overflow-hidden rounded-lg',
        gradientRing && 'ring-gradient',
        className,
      )}
      {...props}
    >
      {/* Sits above the ::before spotlight so content never gets washed out. */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
