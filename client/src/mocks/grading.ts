import { getCaseBrief } from '@/mocks/data/caseBriefs';
import { CASE_DETAILS } from '@/mocks/data/caseDetails';
import { findCaseById } from '@/mocks/data/cases';
import { AI_REVIEWER_ROLE, buildDemoReview } from '@/mocks/data/reviewResults';
import { mockDb, type IMockEnrollmentRecord } from '@/mocks/db';
import { getInitialShareConsent } from '@/mocks/profileApi';
import type {
  IAiGradingProgress,
  ICaseBrief,
  ICaseDetail,
  IReviewResult,
  IRevisionRequest,
  TTier,
} from '@/types';

// Penerapan hasil penilaian (reviewer atau AI) dan simulasi antrean penilaian AI untuk mode mock.
// Di produksi AI menilai di backend; klien cukup memeriksa ulang GET /cases/:slug/status.

/** Lama satu tahap penilaian AI tiruan: satu tahap per kriteria, plus satu tahap menyusun feedback. */
const AI_STEP_SECONDS = 3;

const createCertificateId = (tier: TTier) =>
  `CERT-${tier.toUpperCase()}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

/** Detail case tanpa data enrollment, cukup untuk membaca brief dan rubrik. */
export function getCaseContext(caseId: string): { detail: ICaseDetail; brief: ICaseBrief } | null {
  const summary = findCaseById(caseId);
  const content = CASE_DETAILS[caseId];
  if (!summary || !content) return null;
  const detail: ICaseDetail = { ...summary, ...content, myEnrollment: null };
  return { detail, brief: getCaseBrief(detail) };
}

/** Batas pengembalian untuk revisi; setelah itu reviewer wajib menilai apa adanya (CONTEXT.md 7). */
export const MAX_REVISIONS = 2;
/** Tambahan tenggat setelah submission dikembalikan untuk revisi (CONTEXT.md bagian 7). */
const REVISION_EXTRA_DAYS = 3;

export const countRevisions = (record: IMockEnrollmentRecord) =>
  (record.events ?? []).filter((event) => event.type === 'revision_requested').length;

/** Menyimpan hasil penilaian: sertifikat langsung terbit bila lulus (tanpa tombol klaim). */
export function applyReview(
  record: IMockEnrollmentRecord,
  review: IReviewResult
): IMockEnrollmentRecord {
  const summary = findCaseById(record.caseId);
  if (!summary) throw new Error('Case tidak ditemukan.');
  const updated = mockDb.updateEnrollment(record.id, {
    status: review.isPassed ? 'passed' : 'failed',
    deadlineAt: null,
    score: review.totalScore,
    review,
    revision: null,
    shareConsent: review.isRecommended ? getInitialShareConsent(record.userId) : null,
    certificateId: review.isPassed ? createCertificateId(summary.tier) : null,
    issuedAt: review.isPassed ? review.reviewedAt : null,
  });
  mockDb.addEnrollmentEvent(record.id, { type: 'reviewed' });
  return updated ?? record;
}

/** Prototype: penilaian dengan skor contoh (panel simulasi dan penilaian AI tiruan). */
export function applyReviewOutcome(
  record: IMockEnrollmentRecord,
  outcome: 'passed' | 'failed',
  reviewerRole: string
): IMockEnrollmentRecord {
  const context = getCaseContext(record.caseId);
  if (!context) throw new Error('Case tidak ditemukan.');
  const { detail, brief } = context;
  return applyReview(record, buildDemoReview(brief, outcome, reviewerRole, detail.tier === 'b2b'));
}

/** Submission belum dinilai: dikembalikan dengan alasan, dan tenggat bertambah 3 hari. */
export function applyRevisionRequest(
  record: IMockEnrollmentRecord,
  request: Omit<IRevisionRequest, 'requestedAt'>
): IMockEnrollmentRecord {
  if (countRevisions(record) >= MAX_REVISIONS) {
    throw new Error(`Batas revisi (${MAX_REVISIONS} kali) sudah habis. Nilai submission ini.`);
  }
  const updated = mockDb.updateEnrollment(record.id, {
    status: 'revision_requested',
    deadlineAt: new Date(Date.now() + REVISION_EXTRA_DAYS * 86_400_000).toISOString(),
    revision: { ...request, requestedAt: new Date().toISOString() },
  });
  mockDb.addEnrollmentEvent(record.id, { type: 'revision_requested' });
  return updated ?? record;
}

const getStepCount = (record: IMockEnrollmentRecord) =>
  (getCaseContext(record.caseId)?.brief.rubric.length ?? 0) + 1;

const getStartedAt = (record: IMockEnrollmentRecord) =>
  new Date(record.submission?.submittedAt ?? record.updatedAt).getTime();

/** null jika enrollment tidak sedang dinilai AI. */
export function getAiGradingProgress(record: IMockEnrollmentRecord): IAiGradingProgress | null {
  if (record.status !== 'ai_grading') return null;
  const startedAt = getStartedAt(record);
  const steps = getStepCount(record);
  const elapsedSteps = Math.floor((Date.now() - startedAt) / (AI_STEP_SECONDS * 1000));
  return {
    startedAt: new Date(startedAt).toISOString(),
    estimatedDoneAt: new Date(startedAt + steps * AI_STEP_SECONDS * 1000).toISOString(),
    checkedCriteria: Math.max(0, Math.min(elapsedSteps, steps - 1)),
  };
}

/**
 * Menyelesaikan penilaian AI yang waktunya sudah habis. Dipanggil setiap kali data enrollment
 * dibaca, sehingga hasil tetap keluar walau peserta meninggalkan halaman status.
 */
export function settleAiGradings(records: IMockEnrollmentRecord[]) {
  records.forEach((record) => {
    if (record.status !== 'ai_grading') return;
    const doneAt = getStartedAt(record) + getStepCount(record) * AI_STEP_SECONDS * 1000;
    if (Date.now() >= doneAt) applyReviewOutcome(record, 'passed', AI_REVIEWER_ROLE);
  });
}
