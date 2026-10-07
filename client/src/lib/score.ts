import type { ICriterionScore } from '@/types';

// Rumus skor rubrik (CONTEXT.md 4.10): poin kriteria = level / 5 × bobot, total 0 sampai 100.

export const MAX_LEVEL = 5;

export const getCriterionPoints = ({ level, weight }: Pick<ICriterionScore, 'level' | 'weight'>) =>
  Math.round((level / MAX_LEVEL) * weight * 10) / 10;

export const calculateTotalScore = (criteria: Pick<ICriterionScore, 'level' | 'weight'>[]) =>
  Math.round(criteria.reduce((total, criterion) => total + getCriterionPoints(criterion), 0));

/** "17,5" (poin bisa berkoma, maksimal satu angka di belakang koma). */
export const formatPoints = (value: number) =>
  value.toLocaleString('id-ID', { maximumFractionDigits: 1 });
