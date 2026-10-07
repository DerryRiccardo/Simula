import type { IFileMeta, TSlotValue } from '@/types';

// Helper isian slot submission, dipakai halaman pengerjaan dan halaman status.

export const isFileMeta = (value: TSlotValue): value is IFileMeta =>
  typeof value === 'object' && value !== null;

export const isSlotFilled = (value: TSlotValue) =>
  isFileMeta(value) || (typeof value === 'string' && value.trim() !== '');
