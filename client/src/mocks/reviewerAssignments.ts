import { listAllCases } from '@/mocks/adminCaseStore';
import { mockDb, type IMockEnrollmentRecord } from '@/mocks/db';

// Penugasan reviewer untuk mode mock, dipakai portal reviewer dan panel admin.
// Akses reviewer per case (reviewer_assignments); satu submission dipegang satu reviewer.

/** Mitra case B2B; null untuk AI case atau B2B case yang belum memilih mitra. */
export function getCasePartnerId(caseId: string) {
  const adminCase = listAllCases().find((item) => item.id === caseId);
  return adminCase?.tier === 'b2b' && adminCase.partnerId ? adminCase.partnerId : null;
}

export const getCaseReviewerIds = (caseId: string) =>
  mockDb
    .listReviewerAssignments()
    .filter((item) => item.caseId === caseId)
    .map((item) => item.reviewerId);

export const isActiveReviewer = (userId: string) => {
  const user = mockDb.findUserById(userId);
  return user?.role === 'reviewer' && user.reviewerProfile?.isActive === true;
};

/**
 * Reviewer yang memegang submission: yang dipilih admin atau yang sudah memutuskan, lalu
 * reviewer aktif pertama yang ditugaskan ke case. null bila case belum punya reviewer aktif.
 */
export function getEffectiveReviewerId(record: IMockEnrollmentRecord) {
  if (record.assignedReviewerId) return record.assignedReviewerId;
  return getCaseReviewerIds(record.caseId).find(isActiveReviewer) ?? null;
}

/** Submission menunggu review yang sedang dipegang reviewer ini. */
export const countPendingReviews = (reviewerId: string) =>
  mockDb
    .listAllEnrollments()
    .filter(
      (record) => record.status === 'in_review' && getEffectiveReviewerId(record) === reviewerId
    ).length;
