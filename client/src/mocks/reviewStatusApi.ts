import { addBusinessDays } from 'date-fns';

import { getCaseBrief } from '@/mocks/data/caseBriefs';
import { findCaseById } from '@/mocks/data/cases';
import { mockDb } from '@/mocks/db';
import { learningApi } from '@/mocks/learningApi';
import { buildDemoReview } from '@/mocks/data/reviewResults';
import { getInitialShareConsent } from '@/mocks/profileApi';
import { getReviewerRole } from '@/mocks/resultApi';
import { getOwnedRecord, toEnrollment } from '@/mocks/workspaceApi';
import type { ICaseStatus, IEnrollment, ISubmissionSlot, TReviewSimulation, TTier } from '@/types';

// Logika halaman status untuk mode mock. Dipakai service saat mock aktif dan oleh handler MSW.

/** SLA review reviewer mitra (CONTEXT.md 4.10). */
const REVIEW_SLA_BUSINESS_DAYS = 5;
/** Tambahan tenggat setelah submission dikembalikan untuk revisi (CONTEXT.md bagian 7). */
const REVISION_EXTRA_DAYS = 3;

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

const createCertificateId = (tier: TTier) =>
  `CERT-${tier.toUpperCase()}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

export const reviewStatusApi = {
  /** null jika slug tidak ditemukan. */
  getStatus: (slug: string): ICaseStatus | null => {
    const caseInfo = learningApi.getCaseBySlug(slug);
    if (!caseInfo) return null;
    const user = mockDb.getSessionUser();
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
    };
  },

  /** Prototype: menggantikan keputusan reviewer dari portal reviewer. */
  simulateReview: (enrollmentId: string, outcome: TReviewSimulation): IEnrollment => {
    const record = getOwnedRecord(enrollmentId);
    if (record.status !== 'in_review') throw new Error('Submission ini tidak sedang direview.');
    const caseInfo = findCaseById(record.caseId);
    const detail = caseInfo ? learningApi.getCaseBySlug(caseInfo.slug) : null;
    if (!caseInfo || !detail) throw new Error('Case tidak ditemukan.');
    const brief = getCaseBrief(detail);
    const reviewerRole = getReviewerRole(detail);

    if (outcome === 'revision') {
      const linkSlot = brief.slots.find((slot) => slot.kind === 'link');
      const updated = mockDb.updateEnrollment(enrollmentId, {
        status: 'revision_requested',
        deadlineAt: new Date(Date.now() + REVISION_EXTRA_DAYS * 86_400_000).toISOString(),
        revision: {
          ...buildDemoRevision(linkSlot),
          reviewerRole,
          requestedAt: new Date().toISOString(),
        },
      });
      mockDb.addEnrollmentEvent(enrollmentId, { type: 'revision_requested' });
      return toEnrollment(updated ?? record);
    }

    // Dinilai: skor dari rubrik, sertifikat langsung terbit bila lulus (tanpa tombol klaim).
    const review = buildDemoReview(brief, outcome, reviewerRole, caseInfo.tier === 'b2b');
    const updated = mockDb.updateEnrollment(enrollmentId, {
      status: review.isPassed ? 'passed' : 'failed',
      deadlineAt: null,
      score: review.totalScore,
      review,
      shareConsent: review.isRecommended ? getInitialShareConsent(record.userId) : null,
      certificateId: review.isPassed ? createCertificateId(caseInfo.tier) : null,
      issuedAt: review.isPassed ? review.reviewedAt : null,
    });
    mockDb.addEnrollmentEvent(enrollmentId, { type: 'reviewed' });
    return toEnrollment(updated ?? record);
  },
};
