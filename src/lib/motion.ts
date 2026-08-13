import type { Transition, Variants } from 'motion/react';

/**
 * Standard Motion Design Tokens for TKI HUT RI 81.
 * Centralizes durations, easings, spring physics, and reusable animation variants.
 * Strictly adheres to TanStack Start SSR + Motion for React Best Practices.
 */

// ─── 1. Durations (seconds) ───
export const motionDuration = {
  instant: 0.1,
  fast: 0.18,
  normal: 0.28,
  slow: 0.42,
  hero: 0.65,
} as const;

// ─── 2. Bezier Easings ───
export const motionEase = {
  standard: [0.2, 0, 0, 1] as const,
  entrance: [0, 0, 0.2, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
  backOut: [0.34, 1.56, 0.64, 1] as const,
  gentle: [0.16, 1, 0.3, 1] as const,
} as const;

// ─── 3. Standard Transitions & Spring Physics ───
export const motionTransition = {
  fast: {
    duration: motionDuration.fast,
    ease: motionEase.standard,
  } satisfies Transition,
  normal: {
    duration: motionDuration.normal,
    ease: motionEase.standard,
  } satisfies Transition,
  slow: {
    duration: motionDuration.slow,
    ease: motionEase.standard,
  } satisfies Transition,
  springSmooth: {
    type: 'spring',
    stiffness: 380,
    damping: 30,
    mass: 0.8,
  } satisfies Transition,
  springBouncy: {
    type: 'spring',
    stiffness: 420,
    damping: 24,
    mass: 0.9,
  } satisfies Transition,
  springSnappy: {
    type: 'spring',
    stiffness: 500,
    damping: 35,
  } satisfies Transition,
  sheet: {
    type: 'spring',
    damping: 32,
    stiffness: 340,
    mass: 0.95,
  } satisfies Transition,
} as const;

// ─── 4. Reusable Variants ───

/** Generic fade in/out */
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: motionTransition.normal,
  },
  exit: {
    opacity: 0,
    transition: motionTransition.fast,
  },
};

/** Subtle entrance from bottom (fade + Y translation) */
export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: motionDuration.normal, ease: motionEase.entrance },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: motionDuration.fast, ease: motionEase.exit },
  },
};

/** Scale entrance for modals, cards, or floating popovers */
export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: motionDuration.fast, ease: motionEase.gentle },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: motionDuration.fast, ease: motionEase.exit },
  },
};

/** Staggered list container */
export const staggerContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.02,
    },
  },
};

/** Staggered children item */
export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: motionDuration.normal, ease: motionEase.entrance },
  },
};

/** Page Route Transition */
export const pageTransitionVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  enter: {
    opacity: 1,
    y: 0,
    transition: { duration: motionDuration.fast, ease: motionEase.standard },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: motionDuration.fast, ease: motionEase.exit },
  },
};

/** Mobile Bottom Sheet / Modal Overlay & Surface */
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
};

export const bottomSheetVariants: Variants = {
  hidden: { y: '100%' },
  visible: {
    y: '0%',
    transition: motionTransition.sheet,
  },
  exit: {
    y: '100%',
    transition: { duration: 0.24, ease: [0.32, 0.72, 0, 1] },
  },
};
