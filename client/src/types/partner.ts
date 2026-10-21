import type { TAdminCaseStatus } from './admin';

// Kontrak data menu Reviewer & Mitra (prototype/CONTEXT.md 4.13). Reviewer adalah praktisi dari
// perusahaan mitra; reviewer hanya bisa menilai submission dari case yang ditugaskan kepadanya.

export interface IPartner {
  id: string;
  name: string;
  industry: string;
  /** Profil singkat yang tampil di halaman detail case B2B. */
  about: string;
}

export interface IAdminPartner extends IPartner {
  /** B2B case milik mitra ini (draft maupun terbit). */
  caseCount: number;
  activeReviewerCount: number;
  /** Submission menunggu review di semua case mitra ini. */
  pendingReviewCount: number;
}

export interface IAdminReviewer {
  id: string;
  name: string;
  email: string;
  partnerId: string;
  partnerName: string;
  /** Contoh: "Senior Backend Engineer". Tampil ke peserta sebagai peran penilai. */
  jobTitle: string;
  isActive: boolean;
  /** Case yang ditugaskan (reviewer_assignments). */
  caseIds: string[];
  /** Submission yang menunggu dinilai reviewer ini. */
  pendingCount: number;
  /** Submission yang sudah diputuskan (dinilai atau dikembalikan). */
  decidedCount: number;
  /** Rata-rata hari kerja dari submit sampai diputuskan; null bila belum ada keputusan. */
  averageReviewDays: number | null;
}

/** B2B case sebagai pilihan penugasan reviewer. */
export interface IAdminPartnerCase {
  id: string;
  title: string;
  fieldKey: string;
  /** null bila case belum memilih mitra. */
  partnerId: string | null;
  status: TAdminCaseStatus;
  price: number;
  /** Submission menunggu review di case ini. */
  pendingReviewCount: number;
  /** Reviewer aktif yang ditugaskan ke case ini. */
  activeReviewerCount: number;
}

export interface IAdminPartnerDirectory {
  partners: IAdminPartner[];
  reviewers: IAdminReviewer[];
  cases: IAdminPartnerCase[];
}

export type IAdminPartnerInput = Omit<IPartner, 'id'>;

export interface IAdminReviewerInput {
  name: string;
  email: string;
  partnerId: string;
  jobTitle: string;
}

export interface IAdminReviewerAssignmentPayload {
  /** Daftar lengkap case untuk reviewer ini; hanya B2B case milik mitranya. */
  caseIds: string[];
}

export interface IAdminReviewerStatusPayload {
  isActive: boolean;
}

/** Pilihan di dialog Ganti reviewer: reviewer aktif dari mitra yang sama. */
export interface IAdminReassignOption {
  id: string;
  name: string;
  jobTitle: string;
  pendingCount: number;
  /** false: reviewer ini sekalian ditugaskan ke case saat dipilih. */
  isAssignedToCase: boolean;
}

export interface IAdminReassignPayload {
  reviewerId: string;
}
