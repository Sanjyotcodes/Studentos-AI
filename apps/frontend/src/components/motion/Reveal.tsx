'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { fadeUp, staggerContainer } from '@/lib/motion';

type DivMotionProps = Omit<HTMLMotionProps<'div'>, 'variants' | 'initial' | 'animate'>;

interface RevealProps extends DivMotionProps {
  /** Delay before this element's own entrance, in seconds. */
  delay?: number;
}

/**
 * A single element that rises and fades in on mount.
 *
 * Use inside a `<Stagger>` for list items — the parent drives the timing and
 * children just declare `variants`, so the rhythm is defined in one place.
 * Standalone (outside a Stagger) it animates itself immediately.
 */
export function Reveal({ delay = 0, children, ...props }: RevealProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      transition={delay ? { delay } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * A single element inside a `<Stagger>`. Declares the variants but no
 * initial/animate of its own — the parent propagates those, which is what
 * makes the children fire in sequence rather than all at once.
 */
export function RevealItem({ children, ...props }: DivMotionProps) {
  return (
    <motion.div variants={fadeUp} {...props}>
      {children}
    </motion.div>
  );
}

/** Container that deals its `<RevealItem>` children out one by one. */
export function Stagger({ children, ...props }: DivMotionProps) {
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" {...props}>
      {children}
    </motion.div>
  );
}
