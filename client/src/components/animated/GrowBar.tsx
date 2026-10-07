'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { cn } from '@/lib/utils';

interface GrowBarProps {
  /** Nilai 0–100. */
  value: number;
  className?: string;
  delay?: number;
}

// Bar progres yang "tumbuh" saat terlihat. Memakai scaleX (transform), bukan width.
export function GrowBar({ value, className, delay = 0 }: GrowBarProps) {
  const shouldReduceMotion = useReducedMotion();
  const scale = Math.min(Math.max(value, 0), 100) / 100;

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-soft">
      <motion.div
        className={cn('h-full w-full origin-left rounded-full bg-brand', className)}
        initial={shouldReduceMotion ? { scaleX: scale } : { scaleX: 0 }}
        whileInView={{ scaleX: scale }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
