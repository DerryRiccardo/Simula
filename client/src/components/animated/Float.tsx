'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface FloatProps {
  children: ReactNode;
  className?: string;
  /** Jarak naik-turun dalam px. */
  distance?: number;
  duration?: number;
  delay?: number;
}

// Gerakan mengambang pelan untuk elemen dekoratif (kartu di hero).
export function Float({ children, className, distance = 8, duration = 5, delay = 0 }: FloatProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.94 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, scale: 1, y: [0, -distance, 0] }}
      transition={{
        opacity: { duration: 0.5, delay },
        scale: { duration: 0.5, delay },
        y: { duration, delay, repeat: Infinity, ease: 'easeInOut' },
      }}
    >
      {children}
    </motion.div>
  );
}
