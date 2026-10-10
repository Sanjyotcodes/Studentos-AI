'use client';

import { MotionConfig } from 'framer-motion';

// One global motion policy.
//
// `reducedMotion="user"` makes Framer respect the OS "reduce motion" setting
// for every component underneath: transform and layout animations are
// skipped, while opacity-only ones still play (the accessibility guidance is
// to remove *movement*, not to make interfaces flicker in and out of
// existence). CSS-driven animation is covered separately by the
// prefers-reduced-motion block in globals.css — together they cover both
// halves of the app's motion.
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
