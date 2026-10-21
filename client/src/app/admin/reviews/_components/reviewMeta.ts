import type { TStatusTone } from '@/constants/enrollmentStatus';
import type { TAdminReviewStatus } from '@/types';

// Label status dari sudut pandang admin. "Perlu revisi" menunggu peserta, bukan admin, jadi netral.
export const ADMIN_REVIEW_STATUS: Record<TAdminReviewStatus, { label: string; tone: TStatusTone }> =
  {
    ai_grading: { label: 'Sedang dinilai AI', tone: 'brand' },
    in_review: { label: 'Menunggu review', tone: 'brand' },
    revision_requested: { label: 'Perlu revisi', tone: 'neutral' },
    passed: { label: 'Lulus', tone: 'success' },
    failed: { label: 'Belum lulus', tone: 'neutral' },
  };
