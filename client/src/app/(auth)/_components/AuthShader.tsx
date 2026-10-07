'use client';

import { GrainGradient } from '@paper-design/shaders-react';
import { useReducedMotion } from 'framer-motion';

// Shader menerima warna hex, bukan class Tailwind. Nilainya disalin dari token brand di globals.css
// (brand-deep, brand, brand-muted, brand-soft) agar tetap satu palet dengan seluruh situs.
const SHADER_BACKGROUND = '#10287a';
const SHADER_COLORS = ['#c7d6fe', '#1d4ed8', '#1d4ed8', '#eef3ff'];

// Latar bergerak bertekstur grain untuk panel brand di halaman auth.
export function AuthShader() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <GrainGradient
      speed={shouldReduceMotion ? 0 : 0.6}
      scale={1}
      rotation={0}
      offsetX={0}
      offsetY={0}
      softness={0.6}
      intensity={0.4}
      noise={0.2}
      shape="corners"
      frame={2854.5}
      colors={SHADER_COLORS}
      colorBack={SHADER_BACKGROUND}
      className="absolute inset-0 bg-brand-deep"
    />
  );
}
