// Shared Framer Motion variants and easings.
//
// Every animated surface in the app pulls from this file rather than
// hand-rolling a transition, so motion reads as one system: the same easing,
// the same distances, the same stagger rhythm everywhere.
//
// Reduced motion is NOT handled here — it's handled once, globally, by
// `<MotionConfig reducedMotion="user">` in MotionProvider. Framer then
// neutralizes transform/opacity animations for users who ask for that, so
// these variants stay simple and declarative.
import type { Variants } from 'framer-motion';
import { duration, spring } from '@/styles/design-tokens';

// A single custom easing for non-spring tweens — a gentle "out" curve that
// decelerates into place. Matches the CSS `ease-out` feel of the token scale.
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const revealSeconds = duration.reveal / 1000;

// Rise-and-fade. The workhorse entrance for cards, rows, and panels.
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: revealSeconds, ease: EASE_OUT },
  },
};

// Same, but softer — for large surfaces where 14px of travel looks heavy.
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: revealSeconds, ease: EASE_OUT } },
};

// Scale-in for hero elements and modals.
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: spring.soft },
};

// Parent container that releases its children one after another.
// `staggerChildren` is what turns a list from "everything appears" into
// "the list deals itself out", which is most of the perceived polish.
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

// A slower stagger for short lists, where 60ms reads as simultaneous.
export const staggerContainerSlow: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.06 },
  },
};

// Hover/press feedback for anything clickable. Kept small on purpose —
// a 1.02 lift reads as responsive; 1.08 reads as a toy.
export const interactiveHover = {
  whileHover: { y: -3, transition: spring.soft },
  whileTap: { scale: 0.985, transition: spring.snappy },
} as const;

// Page-level transition used by the route-change wrapper.
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_OUT } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18, ease: 'easeIn' } },
};
