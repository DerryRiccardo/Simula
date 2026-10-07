import type { ICaseDetail, IEnrollment } from './case';
import type { IRubricCriterion, ISubmissionRecord, ISubmissionSlot } from './workspace';

// Kontrak data halaman status (prototype/CONTEXT.md 4.8): menunggu review, perlu revisi, dinilai AI.

/** Peristiwa penting dalam riwayat satu enrollment, dipakai untuk timeline progres. */
export type TStatusEventType =
  'paid' | 'started' | 'submitted' | 'revision_requested' | 'reviewed' | 'retried';

export interface IStatusEvent {
  type: TStatusEventType;
  at: string;
  /** Untuk "submitted": percobaan ke-n (1 = submit pertama, 2+ = submit ulang setelah revisi). */
  attempt?: number;
}

export interface ICaseStatus {
  caseInfo: ICaseDetail;
  /** null = pengguna belum mengambil case ini. */
  enrollment: IEnrollment | null;
  submission: ISubmissionRecord | null;
  slots: ISubmissionSlot[];
  rubric: IRubricCriterion[];
  passingScore: number;
  /** Batas hasil review sesuai SLA (5 hari kerja sejak submit terakhir). null jika belum submit. */
  reviewDueAt: string | null;
  /** Urut dari yang paling lama. */
  events: IStatusEvent[];
}

/** Prototype: keputusan reviewer tiruan dari panel demo. */
export type TReviewSimulation = 'revision' | 'passed' | 'failed';
