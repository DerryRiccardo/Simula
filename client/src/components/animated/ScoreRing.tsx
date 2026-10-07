'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface ScoreRingProps {
  score: number;
  max?: number;
  label?: string;
}

const RADIUS = 34;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreRing({ score, max = 100, label = 'Skor' }: ScoreRingProps) {
  const shouldReduceMotion = useReducedMotion();
  const offset = CIRCUMFERENCE * (1 - score / max);

  return (
    <div className="relative grid size-20 shrink-0 place-items-center">
      <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle
          cx="40"
          cy="40"
          r={RADIUS}
          className="fill-none stroke-surface-soft"
          strokeWidth="7"
        />
        <motion.circle
          cx="40"
          cy="40"
          r={RADIUS}
          className="fill-none stroke-brand"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: shouldReduceMotion ? offset : CIRCUMFERENCE }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <p className="text-center leading-none">
        <span className="block text-xl font-semibold text-ink">{score}</span>
        <span className="text-[0.625rem] text-ink-subtle">{label}</span>
      </p>
    </div>
  );
}
