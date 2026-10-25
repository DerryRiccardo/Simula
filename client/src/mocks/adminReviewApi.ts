import { addBusinessDays, differenceInHours } from 'date-fns';

import { REVIEW_SLA_BUSINESS_DAYS } from '@/constants/review';
import { ApiResponseError } from '@/lib/apiError';
import { requireAdmin } from '@/mocks/adminGuard';
import { mockDb, type IMockEnrollmentRecord } from '@/mocks/db';
import { getCaseContext, settleAiGradings } from '@/mocks/grading';
import { getReviewerRole, resolveReview } from '@/mocks/resultApi';
import {
  countPendingReviews,
  getCasePartnerId,
  getCaseReviewerIds,
  getEffectiveReviewerId,
} from '@/mocks/reviewerAssignments';
import type {
  IAdminCaseGradingStat,
  IAdminFlagPayload,
  IAdminReassignOption,
  IAdminReassignPayload,
  IAdminReviewDetail,
  IAdminReviewItem,
  IAdminReviewList,
  TAdminReviewStatus,
  TEnrollmentStatus,
} from '@/types';

// Menu Penilaian panel admin untuk mode mock (CONTEXT.md 4.13): pengawasan penilaian AI dan
// review praktisi B2B, dengan identitas peserta terlihat. Digabung ke adminApi.

const REVIEW_STATUSES: TEnrollmentStatus[] = [
  'ai_grading',
  'in_review',
  'revision_requested',
  'passed',
  'failed',
] satisfies TAdminReviewStatus[];
const REMINDER_COOLDOWN_HOURS = 24;
const MIN_NOTE_LENGTH = 10;

const isReviewStatus = (status: TEnrollmentStatus): status is TAdminReviewStatus =>
  REVIEW_STATUSES.includes(status);

const lastEventAt = (record: IMockEnrollmentRecord, type: string) =>
  [...(record.events ?? [])].reverse().find((event) => event.type === type)?.at ?? null;

/** Seed lama tanpa submission memakai waktu sertifikat atau update terakhir sebagai perkiraan. */
const getSubmittedAt = (record: IMockEnrollmentRecord) =>
  record.submission?.submittedAt ??
  lastEventAt(record, 'submitted') ??
  record.issuedAt ??
  record.updatedAt;

/** Batas SLA review: 5 hari kerja sejak submit terakhir, sama dengan portal reviewer. */
export const getReviewDueAt = (record: IMockEnrollmentRecord) =>
  addBusinessDays(new Date(getSubmittedAt(record)), REVIEW_SLA_BUSINESS_DAYS);

function getDecidedAt(record: IMockEnrollmentRecord, reviewedAt: string | null) {
  if (record.status === 'revision_requested')
    return lastEventAt(record, 'revision_requested') ?? record.revision?.requestedAt ?? null;
  if (record.status === 'passed' || record.status === 'failed')
    return reviewedAt ?? lastEventAt(record, 'reviewed') ?? record.issuedAt ?? record.updatedAt;
  return null;
}

export function toReviewItem(record: IMockEnrollmentRecord): IAdminReviewItem | null {
  const context = getCaseContext(record.caseId);
  if (!context || !isReviewStatus(record.status)) return null;
  const { detail, brief } = context;
  const member = mockDb.findUserById(record.userId);
  const isB2b = detail.tier === 'b2b';
  const reviewer = isB2b ? mockDb.findUserById(getEffectiveReviewerId(record) ?? '') : undefined;
  const review = resolveReview(record, detail);
  return {
    id: record.id,
    tier: detail.tier,
    memberId: record.userId,
    memberName: member?.name ?? 'Member',
    memberEmail: member?.email ?? '',
    caseId: detail.id,
    caseTitle: detail.title,
    partnerName: detail.partnerName,
    reviewerId: reviewer?.id ?? null,
    reviewerName: reviewer?.name ?? null,
    reviewerRole: reviewer?.reviewerProfile?.jobTitle ?? (isB2b ? getReviewerRole(detail) : null),
    status: record.status,
    attempt: record.submission?.attempt ?? 1,
    submittedAt: getSubmittedAt(record),
    reviewDueAt:
      isB2b && record.status === 'in_review' ? getReviewDueAt(record).toISOString() : null,
    decidedAt: getDecidedAt(record, review?.reviewedAt ?? null),
    score: record.score,
    passingScore: brief.passingScore,
    certificateId: record.certificateId,
    isFlagged: !!record.adminFlag,
    lastReminderAt: record.lastReminderAt ?? null,
    isRecommended: review?.isRecommended ?? false,
  };
}

function getAiCaseStats(items: IAdminReviewItem[]): IAdminCaseGradingStat[] {
  const byCase = new Map<string, IAdminReviewItem[]>();
  items
    .filter((item) => item.tier === 'ai' && item.status !== 'ai_grading')
    .forEach((item) => byCase.set(item.caseId, [...(byCase.get(item.caseId) ?? []), item]));
  return [...byCase.values()]
    .map((graded) => {
      const scores = graded.flatMap((item) => (item.score === null ? [] : [item.score]));
      return {
        caseId: graded[0].caseId,
        caseTitle: graded[0].caseTitle,
        gradedCount: graded.length,
        passedCount: graded.filter((item) => item.status === 'passed').length,
        averageScore:
          scores.length > 0
            ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length)
            : null,
        flaggedCount: graded.filter((item) => item.isFlagged).length,
      };
    })
    .sort((a, b) => b.gradedCount - a.gradedCount || a.caseTitle.localeCompare(b.caseTitle));
}

function getRecord(id: string) {
  requireAdmin();
  const record = mockDb.findEnrollmentById(id);
  if (!record || !toReviewItem(record))
    throw new ApiResponseError(404, 'Penilaian tidak ditemukan.');
  return record;
}

/** Reviewer aktif dari mitra yang sama, selain yang sedang memegang submission ini. */
function getReassignOptions(record: IMockEnrollmentRecord): IAdminReassignOption[] {
  const partnerId = getCasePartnerId(record.caseId);
  const currentId = getEffectiveReviewerId(record);
  const caseReviewerIds = getCaseReviewerIds(record.caseId);
  if (!partnerId) return [];
  return mockDb
    .listAllUsers()
    .filter(
      (user) =>
        user.role === 'reviewer' &&
        user.id !== currentId &&
        user.reviewerProfile?.partnerId === partnerId &&
        user.reviewerProfile.isActive
    )
    .map((user) => ({
      id: user.id,
      name: user.name,
      jobTitle: user.reviewerProfile?.jobTitle ?? '',
      pendingCount: countPendingReviews(user.id),
      isAssignedToCase: caseReviewerIds.includes(user.id),
    }))
    .sort((a, b) => a.pendingCount - b.pendingCount || a.name.localeCompare(b.name, 'id'));
}

function toDetail(record: IMockEnrollmentRecord): IAdminReviewDetail {
  const item = toReviewItem(record);
  const context = getCaseContext(record.caseId);
  if (!item || !context) throw new ApiResponseError(404, 'Penilaian tidak ditemukan.');
  const isPendingB2b = item.tier === 'b2b' && item.status === 'in_review';
  const hoursSinceReminder = item.lastReminderAt
    ? differenceInHours(new Date(), new Date(item.lastReminderAt))
    : Infinity;
  return {
    item,
    caseInfo: context.detail,
    brief: context.brief,
    submission: record.submission ?? null,
    lastRevision: record.revision ?? null,
    review: resolveReview(record, context.detail),
    events: record.events ?? [],
    flag: record.adminFlag ?? null,
    canRegrade: item.tier === 'ai' && (item.status === 'passed' || item.status === 'failed'),
    canRemind: isPendingB2b && !!item.reviewerId && hoursSinceReminder >= REMINDER_COOLDOWN_HOURS,
    reassignOptions: isPendingB2b ? getReassignOptions(record) : [],
  };
}

function requireNote(value: string | undefined, field: string, message: string) {
  const note = value?.trim() ?? '';
  if (note.length < MIN_NOTE_LENGTH) {
    throw new ApiResponseError(422, message, [
      { field, message: `Tulis minimal ${MIN_NOTE_LENGTH} karakter.` },
    ]);
  }
  return note;
}

export const adminReviewApi = {
  listReviews: (): IAdminReviewList => {
    requireAdmin();
    settleAiGradings(mockDb.listAllEnrollments());
    const items = mockDb
      .listAllEnrollments()
      .flatMap((record) => toReviewItem(record) ?? [])
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    return { items, aiCaseStats: getAiCaseStats(items) };
  },

  /** null jika enrollment tidak ada atau belum sampai tahap penilaian. */
  getReview: (id: string): IAdminReviewDetail | null => {
    requireAdmin();
    settleAiGradings(mockDb.listAllEnrollments());
    const record = mockDb.findEnrollmentById(id);
    return record && toReviewItem(record) ? toDetail(record) : null;
  },

  /**
   * AI: jalankan ulang penilaian, misalnya setelah rubrik diperbaiki. Hasil lama dan sertifikatnya
   * diganti hasil baru; sertifikat terbit lagi bila lulus.
   */
  regrade: (id: string): IAdminReviewDetail => {
    const record = getRecord(id);
    if (!toDetail(record).canRegrade) {
      throw new ApiResponseError(
        409,
        'Hanya AI case yang sudah selesai dinilai bisa dinilai ulang.'
      );
    }
    const updated = mockDb.updateEnrollment(
      record.id,
      {
        status: 'ai_grading',
        aiGradingStartedAt: new Date().toISOString(),
        score: null,
        review: null,
        certificateId: null,
        issuedAt: null,
      },
      { isTouch: false }
    );
    return toDetail(updated ?? record);
  },

  /** Tandai (atau lepas tanda) bermasalah: catatan internal, tidak terlihat peserta. */
  setFlag: (id: string, { isFlagged, note }: IAdminFlagPayload): IAdminReviewDetail => {
    const record = getRecord(id);
    const adminFlag = isFlagged
      ? {
          note: requireNote(note, 'note', 'Jelaskan masalahnya.'),
          flaggedAt: new Date().toISOString(),
        }
      : null;
    return toDetail(
      mockDb.updateEnrollment(record.id, { adminFlag }, { isTouch: false }) ?? record
    );
  },

  /** B2B: kirim pengingat ke reviewer (email + in-app di produksi). Maksimal sekali per 24 jam. */
  remindReviewer: (id: string): IAdminReviewDetail => {
    const record = getRecord(id);
    if (!toDetail(record).canRemind) {
      throw new ApiResponseError(409, 'Pengingat sudah dikirim dalam 24 jam terakhir.');
    }
    const updated = mockDb.updateEnrollment(
      record.id,
      { lastReminderAt: new Date().toISOString() },
      { isTouch: false }
    );
    return toDetail(updated ?? record);
  },

  /**
   * B2B: pindahkan submission ke reviewer lain dari mitra yang sama. Bila reviewer itu belum
   * ditugaskan ke case, penugasannya ditambahkan. Draft penilaian reviewer lama dibuang.
   */
  reassignReviewer: (id: string, { reviewerId }: IAdminReassignPayload): IAdminReviewDetail => {
    const record = getRecord(id);
    const option = toDetail(record).reassignOptions.find((item) => item.id === reviewerId);
    if (!option) {
      throw new ApiResponseError(422, 'Pilih reviewer aktif dari mitra yang sama.', [
        { field: 'reviewerId', message: 'Reviewer tidak tersedia untuk case ini.' },
      ]);
    }
    if (!option.isAssignedToCase) {
      const caseIds = mockDb
        .listReviewerAssignments()
        .filter((item) => item.reviewerId === reviewerId)
        .map((item) => item.caseId);
      mockDb.setReviewerCases(reviewerId, [...caseIds, record.caseId]);
    }
    const updated = mockDb.updateEnrollment(
      record.id,
      { assignedReviewerId: reviewerId, reviewDraft: null, lastReminderAt: null },
      { isTouch: false }
    );
    return toDetail(updated ?? record);
  },
};
