import type { TStudentStatus } from './auth';
import type { TEnrollmentStatus, TTier } from './case';
import type { TOrderStatus, TPaymentMethod } from './checkout';
import type { TShareDefault } from './profile';

// Kontrak data menu Member dan Order panel admin (prototype/CONTEXT.md 4.13).
// Admin melihat identitas peserta; status order mengikuti payment gateway (tidak diubah manual).

export interface IAdminMemberSummary {
  id: string;
  name: string;
  email: string;
  studentStatus: TStudentStatus | null;
  major: string | null;
  fieldKeys: string[];
  joinedAt: string;
  /** Aktivitas case terakhir; null bila belum pernah mengambil case. */
  lastActiveAt: string | null;
  aiCaseCount: number;
  b2bCaseCount: number;
  /** Case yang sedang berjalan: dikerjakan, dinilai, menunggu review, atau perlu revisi. */
  activeCaseCount: number;
  /** Sertifikat yang masih berlaku (tidak dicabut). */
  certificateCount: number;
  /** Total order berhasil (rupiah). */
  totalSpent: number;
}

export interface IAdminMemberEnrollment {
  id: string;
  caseId: string;
  caseTitle: string;
  tier: TTier;
  partnerName: string | null;
  status: TEnrollmentStatus;
  score: number | null;
  updatedAt: string;
  /** true bila sudah sampai tahap penilaian, sehingga punya halaman detail penilaian. */
  hasReview: boolean;
}

export interface IAdminMemberCertificate {
  id: string;
  enrollmentId: string;
  caseTitle: string;
  tier: TTier;
  score: number;
  issuedAt: string;
  revokedAt: string | null;
}

export interface IAdminMemberDetail {
  member: IAdminMemberSummary & {
    institution: string | null;
    linkedinUrl: string | null;
    /** Pilihan bawaan saat diminta berbagi profil ke mitra. */
    shareDefault: TShareDefault;
  };
  enrollments: IAdminMemberEnrollment[];
  orders: IAdminOrder[];
  certificates: IAdminMemberCertificate[];
}

export interface IAdminOrder {
  id: string;
  invoiceNumber: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  caseId: string;
  caseTitle: string;
  partnerName: string | null;
  method: TPaymentMethod;
  status: TOrderStatus;
  subtotal: number;
  adminFee: number;
  total: number;
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
  vaNumber: string | null;
}
