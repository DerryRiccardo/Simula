// Tier produk. 'ai' = AI Case Study (gratis), 'b2b' = B2B Case Study (berbayar).
export type TTier = 'ai' | 'b2b';

export type TCaseLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ICaseSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  tier: TTier;
  fieldKey: string;
  level: TCaseLevel;
  durationLabel: string;
  deliverableCount: number;
  /** Hanya untuk B2B. */
  partnerName: string | null;
  /** Rupiah; null = gratis. */
  price: number | null;
  participantCount: number;
  rating: number;
}

/** relevance = bidang pilihan pengguna lebih dulu. */
export type TCaseSort = 'relevance' | 'popular' | 'rating' | 'price_low';

export interface ICaseListParams {
  tier?: TTier;
  field?: string;
  level?: TCaseLevel;
  sort?: TCaseSort;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ICaseDeliverable {
  title: string;
  description: string;
}

export interface ICaseCriterion {
  name: string;
  /** Bobot dalam persen; total semua kriteria = 100. */
  weight: number;
}

export interface ICasePartner {
  name: string;
  industry: string;
  about: string;
}

/**
 * Info umum case untuk halaman detail sebelum user mulai (AI) atau membayar (B2B).
 * Brief lengkap, materi, rubrik rinci, dan slot submission TIDAK termasuk di sini.
 */
export interface ICaseDetail extends ICaseSummary {
  about: string;
  /** Gambaran langkah kerja, tanpa instruksi rinci. */
  activities: string[];
  deliverables: ICaseDeliverable[];
  skills: string[];
  prerequisites: string[];
  criteria: ICaseCriterion[];
  /** Hanya untuk B2B, misalnya "Senior Backend Engineer". */
  reviewerRole: string | null;
  partner: ICasePartner | null;
  /** Enrollment pengguna yang sedang masuk untuk case ini, jika sudah ada. */
  myEnrollment: { status: TEnrollmentStatus } | null;
}

/**
 * Status enrollment, mengikuti prototype/CONTEXT.md bagian 4.9.
 * AI: in_progress → ai_grading → passed/failed.
 * B2B: pending_payment → not_started → in_progress → in_review ⇄ revision_requested → passed/failed.
 */
export type TEnrollmentStatus =
  | 'pending_payment'
  | 'not_started'
  | 'in_progress'
  | 'ai_grading'
  | 'in_review'
  | 'revision_requested'
  | 'passed'
  | 'failed';

export interface IEnrollment {
  id: string;
  caseSummary: ICaseSummary;
  status: TEnrollmentStatus;
  /** ISO string. Batas pengerjaan (B2B) atau batas bayar (pending_payment). */
  deadlineAt: string | null;
  updatedAt: string;
  score: number | null;
  certificateId: string | null;
}

export type TEnrollmentSort = 'recent' | 'deadline' | 'title';

export interface IEnrollmentListParams {
  tier?: TTier;
  status?: TEnrollmentStatus;
  field?: string;
  search?: string;
  sort?: TEnrollmentSort;
}

export interface ICertificate {
  id: string;
  caseTitle: string;
  tier: TTier;
  fieldKey: string;
  recipientName: string;
  partnerName: string | null;
  score: number;
  issuedAt: string;
}

export interface IDashboardSummary {
  stats: {
    activeCount: number;
    inReviewCount: number;
    revisionCount: number;
    certificateCount: number;
  };
  /** Enrollment yang menunggu aksi pengguna (lanjutkan, bayar, revisi, mulai). */
  actionItems: IEnrollment[];
  recommendations: ICaseSummary[];
  hasPassedAiCase: boolean;
  hasPassedB2bCase: boolean;
}
