import { addBusinessDays } from 'date-fns';

import { getCaseBrief } from '@/mocks/data/caseBriefs';
import { findCaseById } from '@/mocks/data/cases';
import { AI_REVIEWER_ROLE } from '@/mocks/data/reviewResults';
import { mockDb } from '@/mocks/db';
import {
  applyReviewOutcome,
  applyRevisionRequest,
  getAiGradingProgress,
  settleAiGradings,
} from '@/mocks/grading';
import { learningApi } from '@/mocks/learningApi';
import { getReviewerRole } from '@/mocks/resultApi';
import { getOwnedRecord, toEnrollment } from '@/mocks/workspaceApi';
import type { ICaseStatus, IEnrollment, ISubmissionSlot, TReviewSimulation } from '@/types';

// Logika halaman status untuk mode mock. Dipakai service saat mock aktif dan oleh handler MSW.

/** SLA review reviewer mitra (CONTEXT.md 4.10). */
const REVIEW_SLA_BUSINESS_DAYS = 5;

// PLACEHOLDER: catatan reviewer contoh untuk demo, menyesuaikan slot tautan pertama bila ada.
function buildDemoRevision(linkSlot: ISubmissionSlot | undefined) {
  if (linkSlot) {
    return {
      reason: 'Tautan tidak bisa dibuka',
      note: `Tautan ${linkSlot.title.toLowerCase()} meminta izin akses. Ubah pengaturan berbagi menjadi publik, lalu kirim ulang. Berkas lainnya sudah bisa dibuka.`,
    };
  }
  return {
    reason: 'Deliverable belum sesuai brief',
    note: 'Salah satu deliverable belum menjawab tugas di brief. Periksa kembali daftar tugas, lalu kirim ulang.',
  };
}

export const reviewStatusApi = {
  /** null jika slug tidak ditemukan. */
  getStatus: (slug: string): ICaseStatus | null => {
    const caseInfo = learningApi.getCaseBySlug(slug);
    if (!caseInfo) return null;
    const user = mockDb.getSessionUser();
    if (user) settleAiGradings(mockDb.listEnrollments(user.id));
    const record = user
      ? mockDb.listEnrollments(user.id).find((item) => item.caseId === caseInfo.id)
      : undefined;
    const brief = getCaseBrief(caseInfo);
    const submission = record?.submission ?? null;

    return {
      caseInfo,
      enrollment: record ? toEnrollment(record) : null,
      submission,
      slots: brief.slots,
      rubric: brief.rubric,
      passingScore: brief.passingScore,
      reviewDueAt: submission
        ? addBusinessDays(new Date(submission.submittedAt), REVIEW_SLA_BUSINESS_DAYS).toISOString()
        : null,
      events: record?.events ?? [],
      aiGrading: record ? getAiGradingProgress(record) : null,
    };
  },

  /**
   * Prototype: menggantikan keputusan reviewer dari portal reviewer, atau mempercepat penilaian
   * AI. AI case tidak mengenal revisi, jadi hanya passed/failed.
   */
  simulateReview: (enrollmentId: string, outcome: TReviewSimulation): IEnrollment => {
    const record = getOwnedRecord(enrollmentId);
    if (record.status === 'ai_grading') {
      if (outcome === 'revision') throw new Error('AI case tidak bisa dikembalikan untuk revisi.');
      return toEnrollment(applyReviewOutcome(record, outcome, AI_REVIEWER_ROLE));
    }
    if (record.status !== 'in_review') throw new Error('Submission ini tidak sedang direview.');
    const caseInfo = findCaseById(record.caseId);
    const detail = caseInfo ? learningApi.getCaseBySlug(caseInfo.slug) : null;
    if (!caseInfo || !detail) throw new Error('Case tidak ditemukan.');
    const brief = getCaseBrief(detail);
    const reviewerRole = getReviewerRole(detail);

    if (outcome === 'revision') {
      const linkSlot = brief.slots.find((slot) => slot.kind === 'link');
      return toEnrollment(
        applyRevisionRequest(record, { ...buildDemoRevision(linkSlot), reviewerRole })
      );
    }

    return toEnrollment(applyReviewOutcome(record, outcome, reviewerRole));
  },
};
