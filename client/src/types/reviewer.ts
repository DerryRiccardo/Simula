import type { ICaseDetail, ICaseSummary, TEnrollmentStatus } from './case';
import type { IReviewFeedback, IReviewResult } from './result';
import type { ICaseBrief, IRevisionRequest, ISubmissionRecord } from './workspace';

// Kontrak data portal reviewer (prototype/CONTEXT.md 4.10). Kandidat selalu anonim.

/** Satu submission di antrean atau riwayat reviewer. */
export interface IReviewQueueItem {
  /** Id enrollment; dipakai di URL halaman review. */
  id: string;
  /** Contoh: "Kandidat #1024". Nama dan email kandidat tidak pernah dikirim ke reviewer. */
  candidateLabel: string;
  caseSummary: ICaseSummary;
  status: TEnrollmentStatus;
  /** Percobaan ke-n; 2+ berarti submit ulang setelah revisi. */
  attempt: number;
  submittedAt: string;
  /** Batas SLA review: 5 hari kerja sejak submit terakhir. */
  reviewDueAt: string;
  /** Berapa kali submission ini sudah dikembalikan untuk revisi. */
  revisionCount: number;
  /** Riwayat: kapan keputusan terakhir dikirim. */
  decidedAt: string | null;
  score: number | null;
  isRecommended: boolean;
}

export interface IReviewerQueue {
  /** Menunggu dinilai, urut dari tenggat review paling dekat. */
  pending: IReviewQueueItem[];
  /** Sudah diputuskan (dinilai atau dikembalikan), urut dari yang terbaru. */
  history: IReviewQueueItem[];
}

export type TReviewDecision = 'grade' | 'revision';

/** Isian form "Nilai" apa adanya (feedback masih teks mentah, satu poin per baris). */
export interface IReviewDraftGrade {
  criteria: { name: string; level: number; reason: string }[];
  strengths: string;
  improvements: string;
  nextSteps: string;
  isRecommended: boolean;
}

/** Draft penilaian milik reviewer; tidak pernah terlihat oleh kandidat. Dihapus saat diputuskan. */
export interface IReviewDraft {
  decision: TReviewDecision;
  grade: IReviewDraftGrade | null;
  revision: IRevisionRequestPayload | null;
  savedAt: string;
}

/** Simpan sebagian: bagian yang dikirim menimpa bagian yang sama di draft. */
export type TReviewDraftPayload = Partial<Omit<IReviewDraft, 'savedAt'>>;

export interface IReviewSubmissionDetail {
  item: IReviewQueueItem;
  caseInfo: ICaseDetail;
  brief: ICaseBrief;
  submission: ISubmissionRecord | null;
  /** Catatan revisi terakhir, untuk membandingkan submit ulang dengan permintaan sebelumnya. */
  lastRevision: IRevisionRequest | null;
  /** Draft penilaian yang tersimpan otomatis; null bila belum ada. */
  draft: IReviewDraft | null;
  /** Hasil penilaian bila sudah dinilai (riwayat). */
  review: IReviewResult | null;
  maxRevisions: number;
  /** false bila batas revisi habis atau submission tidak sedang menunggu review. */
  canRequestRevision: boolean;
  /** Saran sistem; keputusan rekomendasi interview tetap di tangan reviewer. */
  recommendationThreshold: number;
}

export interface IGradeSubmissionPayload {
  criteria: { name: string; level: number; reason: string }[];
  feedback: IReviewFeedback;
  isRecommended: boolean;
}

export interface IRevisionRequestPayload {
  reason: string;
  note: string;
}
