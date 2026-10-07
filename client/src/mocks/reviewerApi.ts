import { addBusinessDays } from 'date-fns';

import {
  RECOMMENDATION_THRESHOLD,
  REVIEW_SLA_BUSINESS_DAYS,
  REVISION_REASONS,
} from '@/constants/review';
import { ApiResponseError } from '@/lib/apiError';
import { calculateTotalScore, MAX_LEVEL } from '@/lib/score';
import { findCaseById } from '@/mocks/data/cases';
import { mockDb, type IMockEnrollmentRecord } from '@/mocks/db';
import {
  applyReview,
  applyRevisionRequest,
  countRevisions,
  getCaseContext,
  MAX_REVISIONS,
} from '@/mocks/grading';
import { getReviewerRole, resolveReview } from '@/mocks/resultApi';
import type {
  IGradeSubmissionPayload,
  IReviewerQueue,
  IReviewQueueItem,
  IReviewDraft,
  IReviewResult,
  IReviewSubmissionDetail,
  IRevisionRequestPayload,
  TReviewDraftPayload,
  TEnrollmentStatus,
} from '@/types';

// Logika portal reviewer untuk mode mock. Dipakai service saat mock aktif dan oleh handler MSW.
// PLACEHOLDER: akun demo reviewer ditugaskan ke semua B2B case agar setiap submission bisa
// didemokan. Di produksi admin menugaskan reviewer per case (CONTEXT.md 4.11).

const DECIDED_STATUSES: TEnrollmentStatus[] = ['revision_requested', 'passed', 'failed'];
const MIN_REASON_LENGTH = 20;

function requireReviewer() {
  const user = mockDb.getSessionUser();
  if (!user) throw new ApiResponseError(401, 'Silakan masuk terlebih dahulu.');
  if (user.role !== 'reviewer') throw new ApiResponseError(403, 'Halaman ini khusus reviewer.');
  return user;
}

const isAssigned = (record: IMockEnrollmentRecord) => findCaseById(record.caseId)?.tier === 'b2b';

const isInQueue = (record: IMockEnrollmentRecord) =>
  isAssigned(record) && (record.status === 'in_review' || DECIDED_STATUSES.includes(record.status));

/** Nomor kandidat stabil dari id enrollment; identitas asli tidak pernah dikirim ke reviewer. */
function getCandidateLabel(enrollmentId: string) {
  // FNV-1a: id yang hanya beda satu karakter tetap menghasilkan nomor yang jauh berbeda.
  let hash = 0x811c9dc5;
  for (const char of enrollmentId) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
  }
  return `Kandidat #${1000 + (hash % 9000)}`;
}

const lastEventAt = (record: IMockEnrollmentRecord, types: string[]) =>
  [...(record.events ?? [])].reverse().find((event) => types.includes(event.type))?.at ?? null;

function getReview(record: IMockEnrollmentRecord): IReviewResult | null {
  const context = getCaseContext(record.caseId);
  return context ? resolveReview(record, context.detail) : null;
}

function toQueueItem(record: IMockEnrollmentRecord): IReviewQueueItem {
  const caseSummary = findCaseById(record.caseId);
  if (!caseSummary) throw new ApiResponseError(404, 'Case tidak ditemukan.');
  const submittedAt =
    record.submission?.submittedAt ?? lastEventAt(record, ['submitted']) ?? record.updatedAt;
  const isDecided = DECIDED_STATUSES.includes(record.status);
  return {
    id: record.id,
    candidateLabel: getCandidateLabel(record.id),
    caseSummary,
    status: record.status,
    attempt: record.submission?.attempt ?? 1,
    submittedAt,
    reviewDueAt: addBusinessDays(new Date(submittedAt), REVIEW_SLA_BUSINESS_DAYS).toISOString(),
    revisionCount: countRevisions(record),
    decidedAt: isDecided
      ? (lastEventAt(record, ['reviewed', 'revision_requested']) ??
        record.issuedAt ??
        record.updatedAt)
      : null,
    score: record.score,
    isRecommended: isDecided ? (getReview(record)?.isRecommended ?? false) : false,
  };
}

function getAssignedRecord(id: string) {
  requireReviewer();
  const record = mockDb.findEnrollmentById(id);
  if (!record || !isInQueue(record)) {
    throw new ApiResponseError(404, 'Submission tidak ditemukan di antreanmu.');
  }
  return record;
}

function requirePending(record: IMockEnrollmentRecord) {
  if (record.status !== 'in_review') {
    throw new ApiResponseError(409, 'Submission ini sudah diputuskan sebelumnya.');
  }
}

export const reviewerApi = {
  getQueue: (): IReviewerQueue => {
    requireReviewer();
    const items = mockDb.listAllEnrollments().filter(isInQueue).map(toQueueItem);
    return {
      pending: items
        .filter((item) => item.status === 'in_review')
        .sort((a, b) => a.reviewDueAt.localeCompare(b.reviewDueAt)),
      history: items
        .filter((item) => item.status !== 'in_review')
        .sort((a, b) => (b.decidedAt ?? '').localeCompare(a.decidedAt ?? '')),
    };
  },

  /** null jika submission tidak ada di antrean reviewer ini. */
  getSubmission: (id: string): IReviewSubmissionDetail | null => {
    requireReviewer();
    const record = mockDb.findEnrollmentById(id);
    const context = record && isInQueue(record) ? getCaseContext(record.caseId) : null;
    if (!record || !context) return null;
    return {
      item: toQueueItem(record),
      caseInfo: context.detail,
      brief: context.brief,
      submission: record.submission ?? null,
      lastRevision: record.revision ?? null,
      draft: record.status === 'in_review' ? (record.reviewDraft ?? null) : null,
      review: getReview(record),
      maxRevisions: MAX_REVISIONS,
      canRequestRevision: record.status === 'in_review' && countRevisions(record) < MAX_REVISIONS,
      recommendationThreshold: RECOMMENDATION_THRESHOLD,
    };
  },

  /** Nilai: level 1-5 dan alasan per kriteria, feedback 3 bagian, rekomendasi opsional. */
  grade: (id: string, payload: IGradeSubmissionPayload): IReviewQueueItem => {
    const record = getAssignedRecord(id);
    requirePending(record);
    const context = getCaseContext(record.caseId);
    if (!context) throw new ApiResponseError(404, 'Case tidak ditemukan.');
    const { detail, brief } = context;

    const criteria = brief.rubric.map((criterion, index) => {
      const input = payload.criteria.find((item) => item.name === criterion.name);
      const field = `criteria.${index}`;
      if (!input || input.level < 1 || input.level > MAX_LEVEL) {
        throw new ApiResponseError(422, 'Pilih level untuk setiap kriteria.', [
          { field: `${field}.level`, message: 'Pilih level 1 sampai 5.' },
        ]);
      }
      if (input.reason.trim().length < MIN_REASON_LENGTH) {
        throw new ApiResponseError(422, 'Alasan per kriteria wajib diisi.', [
          {
            field: `${field}.reason`,
            message: `Tulis alasan minimal ${MIN_REASON_LENGTH} karakter.`,
          },
        ]);
      }
      return { ...criterion, level: input.level, reason: input.reason.trim() };
    });

    const totalScore = calculateTotalScore(criteria);
    const isPassed = totalScore >= brief.passingScore;
    const review: IReviewResult = {
      totalScore,
      passingScore: brief.passingScore,
      isPassed,
      criteria: criteria.map(({ name, weight, level, reason }) => ({
        name,
        weight,
        level,
        reason,
      })),
      feedback: payload.feedback,
      reviewerRole: getReviewerRole(detail),
      reviewedAt: new Date().toISOString(),
      // Rekomendasi hanya bermakna untuk kandidat yang lulus.
      isRecommended: isPassed && payload.isRecommended,
    };
    mockDb.updateEnrollment(record.id, { reviewDraft: null });
    return toQueueItem(applyReview(record, review));
  },

  /** Simpan otomatis isian form penilaian, agar tidak hilang saat tab tertutup. */
  saveDraft: (id: string, payload: TReviewDraftPayload): IReviewDraft => {
    const record = getAssignedRecord(id);
    requirePending(record);
    const draft: IReviewDraft = {
      decision: 'grade',
      grade: null,
      revision: null,
      ...record.reviewDraft,
      ...payload,
      savedAt: new Date().toISOString(),
    };
    mockDb.updateEnrollment(record.id, { reviewDraft: draft });
    return draft;
  },

  /** Kembalikan untuk revisi: belum dinilai, skor tidak berkurang, tenggat +3 hari. */
  requestRevision: (id: string, payload: IRevisionRequestPayload): IReviewQueueItem => {
    const record = getAssignedRecord(id);
    requirePending(record);
    const context = getCaseContext(record.caseId);
    if (!context) throw new ApiResponseError(404, 'Case tidak ditemukan.');
    if (!(REVISION_REASONS as readonly string[]).includes(payload.reason)) {
      throw new ApiResponseError(422, 'Pilih alasan pengembalian.', [
        { field: 'reason', message: 'Pilih salah satu alasan.' },
      ]);
    }
    if (payload.note.trim().length < MIN_REASON_LENGTH) {
      throw new ApiResponseError(422, 'Catatan untuk kandidat wajib diisi.', [
        { field: 'note', message: `Tulis catatan minimal ${MIN_REASON_LENGTH} karakter.` },
      ]);
    }
    try {
      mockDb.updateEnrollment(record.id, { reviewDraft: null });
      return toQueueItem(
        applyRevisionRequest(record, {
          reason: payload.reason,
          note: payload.note.trim(),
          reviewerRole: getReviewerRole(context.detail),
        })
      );
    } catch (error) {
      throw new ApiResponseError(409, error instanceof Error ? error.message : 'Gagal.');
    }
  },
};
