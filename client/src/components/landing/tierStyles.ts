import type { TTier } from '@/types';

// Kelas warna per tier, supaya hijau (AI) dan biru (B2B) konsisten di semua komponen.
export const TIER_STYLES: Record<
  TTier,
  {
    text: string;
    softBg: string;
    solidBg: string;
    border: string;
    hoverBorder: string;
    button: 'ai' | 'b2b';
  }
> = {
  ai: {
    text: 'text-ai',
    softBg: 'bg-ai-soft',
    solidBg: 'bg-ai',
    border: 'border-ai',
    hoverBorder: 'hover:border-ai/40',
    button: 'ai',
  },
  b2b: {
    text: 'text-b2b',
    softBg: 'bg-b2b-soft',
    solidBg: 'bg-b2b',
    border: 'border-b2b',
    hoverBorder: 'hover:border-b2b/40',
    button: 'b2b',
  },
};
