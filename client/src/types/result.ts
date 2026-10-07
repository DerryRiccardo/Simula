import type { ICaseDetail, ICertificate, IEnrollment } from './case';
import type { ISubmissionRecord, ISubmissionSlot } from './workspace';

// Kontrak data halaman hasil (prototype/CONTEXT.md 4.5 untuk AI, 4.8 dan 4.10 untuk B2B).

/** Skor satu kriteria rubrik. Poin = level / 5 × bobot (CONTEXT.md 4.10). */
export interface ICriterionScore {
  name: string;
  /** Persen; total semua kriteria = 100. */
  weight: number;
  /** Level 1 sampai 5 yang dipilih penilai. */
  level: number;
  /** Alasan penilai untuk kriteria ini (wajib diisi reviewer). */
  reason: string;
}

/** Feedback keseluruhan tiga bagian. */
export interface IReviewFeedback {
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
}

export interface IReviewResult {
  /** 0 sampai 100, dihitung dari kriteria. */
  totalScore: number;
  passingScore: number;
  isPassed: boolean;
  criteria: ICriterionScore[];
  feedback: IReviewFeedback;
  /** Contoh: "Senior Financial Analyst", atau "Penilai AI" untuk AI case. */
  reviewerRole: string;
  reviewedAt: string;
  /** B2B saja: keputusan reviewer untuk merekomendasikan ke daftar prioritas interview. */
  isRecommended: boolean;
}

/** Persetujuan berbagi profil ke perusahaan mitra setelah direkomendasikan reviewer. */
export type TShareConsent = 'pending' | 'granted' | 'declined';

export interface ICaseResult {
  caseInfo: ICaseDetail;
  /** null = pengguna belum mengambil case ini. */
  enrollment: IEnrollment | null;
  /** null = belum dinilai. */
  review: IReviewResult | null;
  /** Terbit otomatis saat lulus. */
  certificate: ICertificate | null;
  submission: ISubmissionRecord | null;
  slots: ISubmissionSlot[];
  /** Hanya ada bila reviewer merekomendasikan ke daftar prioritas interview. */
  shareConsent: TShareConsent | null;
  /** Belum lulus: AI boleh mencoba lagi tanpa batas, B2B boleh submit ulang 1 kali. */
  canRetry: boolean;
}
