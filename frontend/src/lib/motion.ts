/** Shared framer-motion presets — Two-zone motion system */

// ── Zone B: Work surfaces (most screens) ──

export const pageTransition = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.2, ease: 'easeOut' },
} as const;

export const listItem = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.15 },
} as const;

export const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
} as const;

// Legacy aliases for backward compatibility
export const fadeIn = pageTransition;
export const fadeInUp = pageTransition;
export const staggerChildren = stagger;

export const scaleOnHover = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { type: 'spring' as const, stiffness: 400, damping: 25 },
} as const;

export const slideInLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
  transition: { duration: 0.2 },
} as const;

export const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.2 },
} as const;

// ── Zone A: Moments (landing, onboarding, interview, score reveals) ──

export const momentEntrance = {
  initial: { opacity: 0, scale: 0.95, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
  transition: { type: 'spring', stiffness: 300, damping: 24 },
} as const;

export const scoreReveal = {
  initial: { pathLength: 0 },
  animate: { pathLength: 1 },
  transition: { type: 'spring', stiffness: 40, damping: 15 },
} as const;

export const celebrationPop = {
  initial: { scale: 0, rotate: -10 },
  animate: { scale: 1, rotate: 0 },
  transition: { type: 'spring', stiffness: 400, damping: 18 },
} as const;
