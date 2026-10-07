import type { ICaseSummary, TEnrollmentStatus } from '@/types';
import { PATHS } from './paths';

// attention = perlu tindakan segera (biru solid); brand = sedang berjalan; success = lulus.
export type TStatusTone = 'neutral' | 'brand' | 'attention' | 'success';

interface IStatusMeta {
  label: string;
  tone: TStatusTone;
  actionLabel: string;
  getHref: (caseSummary: ICaseSummary) => string;
}

// Satu status → satu label, warna, dan tombol aksi utama (prototype/CONTEXT.md bagian 4.9).
export const ENROLLMENT_STATUS: Record<TEnrollmentStatus, IStatusMeta> = {
  pending_payment: {
    label: 'Menunggu pembayaran',
    tone: 'attention',
    actionLabel: 'Bayar sekarang',
    getHref: ({ slug }) => PATHS.caseCheckout(slug),
  },
  not_started: {
    label: 'Belum dimulai',
    tone: 'neutral',
    actionLabel: 'Mulai mengerjakan',
    getHref: ({ slug }) => PATHS.caseWork(slug),
  },
  in_progress: {
    label: 'Sedang dikerjakan',
    tone: 'brand',
    actionLabel: 'Lanjutkan',
    getHref: ({ slug }) => PATHS.caseWork(slug),
  },
  ai_grading: {
    label: 'Sedang dinilai AI',
    tone: 'brand',
    actionLabel: 'Lihat status',
    getHref: ({ slug }) => PATHS.caseStatus(slug),
  },
  in_review: {
    label: 'Menunggu review',
    tone: 'brand',
    actionLabel: 'Lihat status',
    getHref: ({ slug }) => PATHS.caseStatus(slug),
  },
  revision_requested: {
    label: 'Perlu revisi',
    tone: 'attention',
    actionLabel: 'Perbaiki submission',
    getHref: ({ slug }) => PATHS.caseWork(slug),
  },
  passed: {
    label: 'Lulus',
    tone: 'success',
    actionLabel: 'Lihat hasil',
    getHref: ({ slug }) => PATHS.caseResult(slug),
  },
  failed: {
    label: 'Belum lulus',
    tone: 'neutral',
    actionLabel: 'Lihat hasil',
    getHref: ({ slug }) => PATHS.caseResult(slug),
  },
};

export const STATUS_FILTERS: { value: TEnrollmentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua status' },
  { value: 'in_progress', label: 'Sedang dikerjakan' },
  { value: 'revision_requested', label: 'Perlu revisi' },
  { value: 'in_review', label: 'Menunggu review' },
  { value: 'pending_payment', label: 'Menunggu pembayaran' },
  { value: 'passed', label: 'Lulus' },
  { value: 'failed', label: 'Belum lulus' },
];
