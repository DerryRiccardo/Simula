import type { ICaseDetail, TCaseLevel, TEnrollmentStatus, TTier } from './case';
import type { IAdminReassignOption } from './partner';
import type { IReviewResult } from './result';
import type { IStatusEvent } from './reviewStatus';
import type { ICaseBrief, IRevisionRequest, ISubmissionRecord, TSlotKind } from './workspace';

// Kontrak data panel admin (prototype/CONTEXT.md 4.11). Semua case dan rubrik dibuat admin.

export type TAdminCaseStatus = 'draft' | 'published';

export interface IAdminCaseSummary {
  id: string;
  title: string;
  tier: TTier;
  fieldKey: string;
  level: TCaseLevel;
  status: TAdminCaseStatus;
  partnerName: string | null;
  participantCount: number;
  /** Submission B2B yang sedang menunggu review. */
  pendingReviewCount: number;
  updatedAt: string;
}

export interface IAdminSlotInput {
  title: string;
  description: string;
  kind: TSlotKind;
  isRequired: boolean;
  /** Ekstensi dipisah koma, mis. "pdf, docx". Hanya untuk slot berkas. */
  formats: string;
  maxSizeMb: number;
}

/** Isi pembuat case: satu objek untuk keenam bagian form. */
export interface IAdminCaseInput {
  tier: TTier;
  // 1. Info umum
  title: string;
  fieldKey: string;
  level: TCaseLevel;
  durationLabel: string;
  summary: string;
  // 2. Brief lengkap (paragraf konteks dipisah baris kosong)
  context: string;
  tasks: { title: string; description: string }[];
  // 3. Materi pendukung (prototype: hanya metadata, tanpa unggahan berkas)
  materials: { name: string; format: string; description: string }[];
  // 4. Slot deliverable
  slots: IAdminSlotInput[];
  // 5. Rubrik
  rubric: { name: string; weight: number; description: string }[];
  passingScore: number;
  // 6. Komersial (B2B saja)
  price: number;
  deadlineDays: number;
  /** Mitra dari menu Reviewer & Mitra; string kosong bila belum dipilih. */
  partnerId: string;
  /** Peran penilai yang tampil ke peserta, mis. "Senior Backend Engineer". */
  reviewerRole: string;
}

export interface IAdminCase extends IAdminCaseInput {
  id: string;
  status: TAdminCaseStatus;
  updatedAt: string;
}

export interface IAdminCaseSavePayload {
  input: IAdminCaseInput;
  /** true = terbitkan (validasi penuh), false = simpan sebagai draft. */
  isPublish: boolean;
}

// Ringkasan panel admin (CONTEXT.md 4.13, Dashboard). Semua angka dihitung backend.

export interface IAdminOverviewStats {
  /** Akun berperan mahasiswa. */
  memberCount: number;
  /** Member yang punya case sedang berjalan (dikerjakan, dinilai, atau perlu revisi). */
  activeMemberCount: number;
  publishedCaseCount: number;
  aiCaseCount: number;
  b2bCaseCount: number;
  draftCaseCount: number;
  /** Submission B2B berstatus menunggu review. */
  pendingReviewCount: number;
  /** Bagian dari pendingReviewCount yang sudah melewati SLA review. */
  overdueReviewCount: number;
  /** Jumlah order berhasil dalam 30 hari terakhir (rupiah). */
  revenueLast30Days: number;
  paidOrderCountLast30Days: number;
  awaitingPaymentCount: number;
  /** Percobaan AI case yang sudah dinilai (lulus atau belum). */
  aiGradedCount: number;
  aiPassedCount: number;
}

/**
 * Butir "Perlu tindakan", diurutkan dari yang paling mendesak.
 * review_overdue / review_due_soon: submission B2B terhadap SLA; payment_expiring: order VA
 * yang batas bayarnya < 24 jam; draft_stale: draft yang lama tidak disunting.
 */
export type TAdminActionKind =
  | 'review_overdue'
  | 'review_due_soon'
  | 'case_without_reviewer'
  | 'payment_expiring'
  | 'draft_stale';

export interface IAdminActionItem {
  id: string;
  kind: TAdminActionKind;
  /** Butir review: enrollment yang dinilai, untuk tautan ke detail penilaian. */
  enrollmentId: string | null;
  caseId: string;
  caseTitle: string;
  /** null untuk draft_stale. */
  memberName: string | null;
  /** Batas SLA review, batas bayar, atau waktu terakhir draft disunting. */
  at: string;
  /** Hanya untuk butir review: nama mitra case. */
  partnerName: string | null;
}

export type TAdminActivityType =
  'submitted' | 'revision_requested' | 'reviewed' | 'paid' | 'certificate_issued';

export interface IAdminActivity {
  id: string;
  type: TAdminActivityType;
  memberName: string;
  caseId: string;
  caseTitle: string;
  tier: TTier;
  at: string;
}

export interface IAdminOverview {
  stats: IAdminOverviewStats;
  actionItems: IAdminActionItem[];
  /** Maksimal 8 aktivitas terbaru. */
  activities: IAdminActivity[];
}

// Penilaian (CONTEXT.md 4.13): pengawasan penilaian AI dan review praktisi B2B. Admin melihat
// identitas peserta; anonimitas hanya berlaku di portal reviewer.

/** Status yang tampil di menu Penilaian: sudah submit, sedang atau sudah dinilai. */
export type TAdminReviewStatus = Extract<
  TEnrollmentStatus,
  'ai_grading' | 'in_review' | 'revision_requested' | 'passed' | 'failed'
>;

export interface IAdminReviewItem {
  /** Id enrollment; dipakai di URL detail penilaian. */
  id: string;
  tier: TTier;
  memberId: string;
  memberName: string;
  memberEmail: string;
  caseId: string;
  caseTitle: string;
  /** B2B: mitra penerbit case. */
  partnerName: string | null;
  /** B2B: reviewer yang memegang submission ini. */
  reviewerId: string | null;
  reviewerName: string | null;
  /** B2B: jabatan reviewer, mis. "Senior Backend Engineer". */
  reviewerRole: string | null;
  status: TAdminReviewStatus;
  attempt: number;
  submittedAt: string;
  /** B2B menunggu review: batas SLA (5 hari kerja sejak submit terakhir). */
  reviewDueAt: string | null;
  decidedAt: string | null;
  score: number | null;
  passingScore: number;
  /** Sertifikat yang terbit (termasuk yang sudah dicabut). */
  certificateId: string | null;
  isCertificateRevoked: boolean;
  /** Ditandai admin sebagai bermasalah, untuk evaluasi prompt dan rubrik AI. */
  isFlagged: boolean;
  /** B2B: pengingat terakhir yang dikirim ke reviewer. */
  lastReminderAt: string | null;
  isRecommended: boolean;
}

/** Ringkasan per AI case: bahan mengecek apakah case atau rubriknya terlalu sulit/mudah. */
export interface IAdminCaseGradingStat {
  caseId: string;
  caseTitle: string;
  gradedCount: number;
  passedCount: number;
  /** null bila belum ada yang dinilai. */
  averageScore: number | null;
  flaggedCount: number;
}

export interface IAdminReviewList {
  items: IAdminReviewItem[];
  aiCaseStats: IAdminCaseGradingStat[];
}

export interface IAdminFlag {
  note: string;
  flaggedAt: string;
}

export interface IAdminCertificateRevocation {
  reason: string;
  revokedAt: string;
}

export interface IAdminReviewDetail {
  item: IAdminReviewItem;
  caseInfo: ICaseDetail;
  brief: ICaseBrief;
  submission: ISubmissionRecord | null;
  /** Catatan revisi terakhir dari reviewer (B2B). */
  lastRevision: IRevisionRequest | null;
  review: IReviewResult | null;
  events: IStatusEvent[];
  flag: IAdminFlag | null;
  revocation: IAdminCertificateRevocation | null;
  /** AI: hanya untuk percobaan yang sudah selesai dinilai. */
  canRegrade: boolean;
  /** B2B: hanya saat menunggu review dan belum diingatkan dalam 24 jam terakhir. */
  canRemind: boolean;
  canRevokeCertificate: boolean;
  /** B2B menunggu review: reviewer lain yang bisa dipilih di Ganti reviewer. */
  reassignOptions: IAdminReassignOption[];
}

export interface IAdminFlagPayload {
  isFlagged: boolean;
  /** Wajib bila isFlagged, minimal 10 karakter. */
  note?: string;
}

export interface IAdminRevokePayload {
  /** Catatan internal, minimal 10 karakter. Halaman verifikasi publik hanya menampilkan tanggal. */
  reason: string;
}
