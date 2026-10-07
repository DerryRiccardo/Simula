import { getCaseBrief } from '@/mocks/data/caseBriefs';
import { findCaseById } from '@/mocks/data/cases';
import { AI_REVIEWER_ROLE, getSeedReview } from '@/mocks/data/reviewResults';
import { mockDb, type IMockEnrollmentRecord } from '@/mocks/db';
import { settleAiGradings } from '@/mocks/grading';
import { learningApi } from '@/mocks/learningApi';
import { getOwnedRecord, toEnrollment } from '@/mocks/workspaceApi';
import type { ICaseDetail, ICaseResult, IEnrollment, IReviewResult } from '@/types';

// Logika halaman hasil untuk mode mock. Dipakai service saat mock aktif dan oleh handler MSW.

/** Tenggat submit ulang B2B setelah belum lulus. Diasumsikan sama dengan tenggat revisi. */
const RETRY_DAYS = 3;

const isReviewed = (record: IMockEnrollmentRecord) =>
  record.status === 'passed' || record.status === 'failed';

export const getReviewerRole = (detail: ICaseDetail) =>
  detail.tier === 'ai' ? AI_REVIEWER_ROLE : (detail.reviewerRole ?? 'Reviewer mitra');

/** Seed demo belum punya data penilaian; dibentuk dari data contoh setiap kali dibaca. */
export function resolveReview(
  record: IMockEnrollmentRecord,
  detail: ICaseDetail
): IReviewResult | null {
  if (record.review || !isReviewed(record)) return record.review ?? null;
  return getSeedReview(
    record.caseId,
    getCaseBrief(detail),
    getReviewerRole(detail),
    record.issuedAt ?? record.updatedAt
  );
}

const canRetry = (record: IMockEnrollmentRecord, detail: ICaseDetail) =>
  record.status === 'failed' && (detail.tier === 'ai' || !record.hasRetried);

export const resultApi = {
  /** null jika slug tidak ditemukan. */
  getResult: (slug: string): ICaseResult | null => {
    const caseInfo = learningApi.getCaseBySlug(slug);
    if (!caseInfo) return null;
    const user = mockDb.getSessionUser();
    if (user) settleAiGradings(mockDb.listEnrollments(user.id));
    const record = user
      ? mockDb.listEnrollments(user.id).find((item) => item.caseId === caseInfo.id)
      : undefined;
    const review = record ? resolveReview(record, caseInfo) : null;
    const certificate = record?.certificateId
      ? (learningApi.listCertificates().find((item) => item.id === record.certificateId) ?? null)
      : null;

    return {
      caseInfo,
      enrollment: record ? toEnrollment(record) : null,
      review,
      certificate,
      submission: record?.submission ?? null,
      slots: getCaseBrief(caseInfo).slots,
      shareConsent: review?.isRecommended ? (record?.shareConsent ?? 'pending') : null,
      canRetry: record ? canRetry(record, caseInfo) : false,
    };
  },

  /** Persetujuan berbagi profil ke mitra setelah direkomendasikan reviewer (CONTEXT.md 4.8). */
  setShareConsent: (enrollmentId: string, isGranted: boolean): ICaseResult['shareConsent'] => {
    const record = getOwnedRecord(enrollmentId);
    const caseSummary = findCaseById(record.caseId);
    const detail = caseSummary ? learningApi.getCaseBySlug(caseSummary.slug) : null;
    if (!detail || !resolveReview(record, detail)?.isRecommended) {
      throw new Error('Tidak ada rekomendasi interview untuk case ini.');
    }
    const shareConsent = isGranted ? 'granted' : 'declined';
    mockDb.updateEnrollment(enrollmentId, { shareConsent });
    return shareConsent;
  },

  /** Belum lulus → kerjakan lagi. AI tanpa batas; B2B sekali, sudah termasuk harga. */
  retry: (enrollmentId: string): IEnrollment => {
    const record = getOwnedRecord(enrollmentId);
    const caseSummary = findCaseById(record.caseId);
    const detail = caseSummary ? learningApi.getCaseBySlug(caseSummary.slug) : null;
    if (!detail || !canRetry(record, detail)) {
      throw new Error('Kesempatan submit ulang untuk case ini sudah habis.');
    }
    const isB2b = detail.tier === 'b2b';
    const updated = mockDb.updateEnrollment(enrollmentId, {
      status: 'in_progress',
      deadlineAt: isB2b ? new Date(Date.now() + RETRY_DAYS * 86_400_000).toISOString() : null,
      score: null,
      review: null,
      draft: null,
      hasRetried: isB2b ? true : record.hasRetried,
    });
    mockDb.addEnrollmentEvent(enrollmentId, { type: 'retried' });
    return toEnrollment(updated ?? record);
  },
};
