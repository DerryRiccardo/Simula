import { differenceInBusinessDays, subDays } from 'date-fns';

import { ApiResponseError } from '@/lib/apiError';
import { CASES } from '@/mocks/data/cases';
import { getPartnerName, listAllCases } from '@/mocks/adminCaseStore';
import { requireAdmin } from '@/mocks/adminGuard';
import { adminMemberApi } from '@/mocks/adminMemberApi';
import { adminPartnerApi } from '@/mocks/adminPartnerApi';
import { adminPlatformApi } from '@/mocks/adminPlatformApi';
import { adminReviewApi, getReviewDueAt } from '@/mocks/adminReviewApi';
import { mockDb } from '@/mocks/db';
import {
  getCaseReviewerIds,
  getEffectiveReviewerId,
  isActiveReviewer,
} from '@/mocks/reviewerAssignments';
import type {
  IAdminActionItem,
  IAdminActivity,
  IAdminCase,
  IAdminCaseInput,
  IAdminCaseSavePayload,
  IAdminCaseSummary,
  IAdminOverview,
  IFieldError,
  TEnrollmentStatus,
} from '@/types';

// Logika panel admin untuk mode mock. Dipakai service saat mock aktif dan oleh handler MSW.

function toSummary(item: IAdminCase): IAdminCaseSummary {
  const seed = CASES.find((summary) => summary.id === item.id);
  const enrollments = mockDb.listAllEnrollments().filter((record) => record.caseId === item.id);
  return {
    id: item.id,
    title: item.title,
    tier: item.tier,
    fieldKey: item.fieldKey,
    level: item.level,
    status: item.status,
    partnerName: item.tier === 'b2b' ? getPartnerName(item.partnerId) : null,
    participantCount: seed?.participantCount ?? enrollments.length,
    pendingReviewCount: enrollments.filter((record) => record.status === 'in_review').length,
    updatedAt: item.updatedAt,
  };
}

/** Validasi ulang di server; aturan sama dengan form (draft cukup berjudul). */
function validate({ input, isPublish }: IAdminCaseSavePayload) {
  if (input.title.trim().length < 5) {
    throw new ApiResponseError(422, 'Judul case wajib diisi.', [
      { field: 'title', message: 'Tulis judul minimal 5 karakter.' },
    ]);
  }
  if (!isPublish) return;
  const totalWeight = input.rubric.reduce((total, criterion) => total + criterion.weight, 0);
  if (totalWeight !== 100) {
    throw new ApiResponseError(422, `Total bobot rubrik ${totalWeight}%, harus 100%.`);
  }
  if (input.tasks.length === 0 || input.slots.length === 0) {
    throw new ApiResponseError(422, 'Case terbit wajib punya minimal satu tugas dan satu slot.');
  }
  if (input.tier !== 'b2b') return;
  const errors: IFieldError[] = [];
  if (!input.partnerId) errors.push({ field: 'partnerId', message: 'Pilih mitra.' });
  if (input.price <= 0) errors.push({ field: 'price', message: 'Harga wajib diisi.' });
  if (input.reviewerRole.trim().length < 2) {
    errors.push({ field: 'reviewerRole', message: 'Peran penilai wajib diisi.' });
  }
  if (errors.length > 0) throw new ApiResponseError(422, errors[0].message, errors);
}

/**
 * Reviewer ditugaskan dari menu Reviewer & Mitra, bukan dari pembuat case. Bila mitra case
 * diganti, penugasan reviewer dari mitra lama dilepas; diblokir bila mereka masih memegang
 * submission yang menunggu di case ini.
 */
function getAssignmentsForPartner(caseId: string | null, partnerId: string) {
  if (partnerId && !mockDb.listPartners().some((item) => item.id === partnerId)) {
    throw new ApiResponseError(422, 'Mitra tidak ditemukan.', [
      { field: 'partnerId', message: 'Pilih mitra dari daftar.' },
    ]);
  }
  if (!caseId) return [];
  const isFromPartner = (reviewerId: string) =>
    mockDb.findUserById(reviewerId)?.reviewerProfile?.partnerId === partnerId;
  const kept = getCaseReviewerIds(caseId).filter(isFromPartner);
  const pendingCount = mockDb
    .listAllEnrollments()
    .filter((record) => record.caseId === caseId && record.status === 'in_review')
    .filter((record) => {
      const holderId = getEffectiveReviewerId(record);
      return holderId !== null && !kept.includes(holderId);
    }).length;
  if (pendingCount > 0) {
    throw new ApiResponseError(
      409,
      `${pendingCount} submission masih dipegang reviewer mitra lama. Pindahkan dulu lewat Ganti reviewer.`,
      [{ field: 'partnerId', message: 'Mitra belum bisa diganti selama ada antrean review.' }]
    );
  }
  return kept;
}

// --- Ringkasan (Dashboard) ---

const ACTIVE_STATUSES: TEnrollmentStatus[] = [
  'in_progress',
  'ai_grading',
  'in_review',
  'revision_requested',
];
const DRAFT_STALE_DAYS = 14;
const PAYMENT_EXPIRING_HOURS = 24;
const ACTIVITY_LIMIT = 8;

const getMemberName = (userId: string) => mockDb.findUserById(userId)?.name ?? 'Member';

function getReviewActions(caseById: Map<string, IAdminCase>, now: Date): IAdminActionItem[] {
  return mockDb.listAllEnrollments().flatMap((record): IAdminActionItem[] => {
    const adminCase = caseById.get(record.caseId);
    if (record.status !== 'in_review' || adminCase?.tier !== 'b2b') return [];
    const dueAt = getReviewDueAt(record);
    const isOverdue = dueAt < now;
    if (!isOverdue && differenceInBusinessDays(dueAt, now) > 1) return [];
    return [
      {
        id: `review-${record.id}`,
        kind: isOverdue ? 'review_overdue' : 'review_due_soon',
        enrollmentId: record.id,
        caseId: adminCase.id,
        caseTitle: adminCase.title,
        memberName: getMemberName(record.userId),
        at: dueAt.toISOString(),
        partnerName: getPartnerName(adminCase.partnerId),
      },
    ];
  });
}

function getPaymentActions(caseById: Map<string, IAdminCase>, now: Date): IAdminActionItem[] {
  return mockDb.listAllOrders().flatMap((order): IAdminActionItem[] => {
    const hoursLeft = (new Date(order.expiresAt).getTime() - now.getTime()) / 3_600_000;
    const isExpiring = hoursLeft >= 0 && hoursLeft <= PAYMENT_EXPIRING_HOURS;
    if (order.status !== 'awaiting_payment' || !isExpiring) return [];
    return [
      {
        id: `payment-${order.id}`,
        kind: 'payment_expiring',
        enrollmentId: null,
        caseId: order.caseId,
        caseTitle: caseById.get(order.caseId)?.title ?? 'Case',
        memberName: getMemberName(order.userId),
        at: order.expiresAt,
        partnerName: null,
      },
    ];
  });
}

function getActionItems(cases: IAdminCase[], now: Date): IAdminActionItem[] {
  const caseById = new Map(cases.map((item) => [item.id, item]));
  const reviews = getReviewActions(caseById, now);
  const staleBefore = subDays(now, DRAFT_STALE_DAYS).toISOString();
  const drafts = cases
    .filter((item) => item.status === 'draft' && item.updatedAt < staleBefore)
    .map((item): IAdminActionItem => ({
      id: `draft-${item.id}`,
      kind: 'draft_stale',
      enrollmentId: null,
      caseId: item.id,
      caseTitle: item.title,
      memberName: null,
      at: item.updatedAt,
      partnerName: null,
    }));

  // B2B case terbit tanpa reviewer aktif: submission peserta akan menunggu tanpa penilai.
  const uncovered = cases
    .filter(
      (item) =>
        item.tier === 'b2b' &&
        item.status === 'published' &&
        !getCaseReviewerIds(item.id).some(isActiveReviewer)
    )
    .map((item): IAdminActionItem => ({
      id: `uncovered-${item.id}`,
      kind: 'case_without_reviewer',
      enrollmentId: null,
      caseId: item.id,
      caseTitle: item.title,
      memberName: null,
      at: item.updatedAt,
      partnerName: getPartnerName(item.partnerId),
    }));

  // Paling mendesak dulu: review terlambat, case tanpa reviewer, tenggat terdekat, draft terlama.
  const byDate = (a: IAdminActionItem, b: IAdminActionItem) => a.at.localeCompare(b.at);
  const dueSoon = [
    ...reviews.filter((item) => item.kind === 'review_due_soon'),
    ...getPaymentActions(caseById, now),
  ];
  return [
    ...reviews.filter((item) => item.kind === 'review_overdue').sort(byDate),
    ...uncovered.sort(byDate),
    ...dueSoon.sort(byDate),
    ...drafts.sort(byDate),
  ];
}

function getActivities(cases: IAdminCase[]): IAdminActivity[] {
  const caseById = new Map(cases.map((item) => [item.id, item]));
  const toActivity = (
    id: string,
    type: IAdminActivity['type'],
    record: { userId: string; caseId: string },
    at: string
  ): IAdminActivity[] => {
    const adminCase = caseById.get(record.caseId);
    if (!adminCase) return [];
    return [
      {
        id,
        type,
        memberName: getMemberName(record.userId),
        caseId: adminCase.id,
        caseTitle: adminCase.title,
        tier: adminCase.tier,
        at,
      },
    ];
  };

  const fromEnrollments = mockDb.listAllEnrollments().flatMap((record) => {
    const events = (record.events ?? []).flatMap((event, index) => {
      const id = `${record.id}-${index}`;
      if (event.type === 'submitted' || event.type === 'revision_requested')
        return toActivity(id, event.type, record, event.at);
      // Hasil lulus sudah terwakili oleh "sertifikat terbit".
      if (event.type === 'reviewed' && record.status !== 'passed')
        return toActivity(id, 'reviewed', record, event.at);
      return [];
    });
    const certificate = record.issuedAt
      ? toActivity(`${record.id}-cert`, 'certificate_issued', record, record.issuedAt)
      : [];
    return [...events, ...certificate];
  });

  // Pembayaran diambil dari order, bukan event "paid", agar tidak tercatat dua kali.
  const fromOrders = mockDb
    .listAllOrders()
    .flatMap((order) =>
      order.status === 'paid' && order.paidAt
        ? toActivity(order.id, 'paid', order, order.paidAt)
        : []
    );

  // Dibalik dulu: untuk waktu yang sama, peristiwa yang dicatat belakangan (hasil) tampil di atas.
  return [...fromEnrollments, ...fromOrders]
    .reverse()
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, ACTIVITY_LIMIT);
}

function getOverview(): IAdminOverview {
  const now = new Date();
  const cases = listAllCases();
  const published = cases.filter((item) => item.status === 'published');
  const tierById = new Map(cases.map((item) => [item.id, item.tier]));
  const enrollments = mockDb.listAllEnrollments();
  const orders = mockDb.listAllOrders();
  const members = mockDb.listAllUsers().filter((user) => user.role === 'student');
  const activeMemberIds = new Set(
    enrollments
      .filter((record) => ACTIVE_STATUSES.includes(record.status))
      .map((record) => record.userId)
  );
  const pendingReviews = enrollments.filter(
    (record) => record.status === 'in_review' && tierById.get(record.caseId) === 'b2b'
  );
  const aiGraded = enrollments.filter(
    (record) =>
      tierById.get(record.caseId) === 'ai' &&
      (record.status === 'passed' || record.status === 'failed')
  );
  const since = subDays(now, 30).toISOString();
  const recentPaid = orders.filter(
    (order) => order.status === 'paid' && (order.paidAt ?? '') >= since
  );

  return {
    stats: {
      memberCount: members.length,
      activeMemberCount: members.filter((user) => activeMemberIds.has(user.id)).length,
      publishedCaseCount: published.length,
      aiCaseCount: published.filter((item) => item.tier === 'ai').length,
      b2bCaseCount: published.filter((item) => item.tier === 'b2b').length,
      draftCaseCount: cases.length - published.length,
      pendingReviewCount: pendingReviews.length,
      overdueReviewCount: pendingReviews.filter((record) => getReviewDueAt(record) < now).length,
      revenueLast30Days: recentPaid.reduce((total, order) => total + order.total, 0),
      paidOrderCountLast30Days: recentPaid.length,
      awaitingPaymentCount: orders.filter((order) => order.status === 'awaiting_payment').length,
      aiGradedCount: aiGraded.length,
      aiPassedCount: aiGraded.filter((record) => record.status === 'passed').length,
    },
    actionItems: getActionItems(cases, now),
    activities: getActivities(cases),
  };
}

export const adminApi = {
  ...adminReviewApi,
  ...adminPartnerApi,
  ...adminMemberApi,
  ...adminPlatformApi,

  getOverview: (): IAdminOverview => {
    requireAdmin();
    return getOverview();
  },

  listCases: (): IAdminCaseSummary[] => {
    requireAdmin();
    return listAllCases().map(toSummary);
  },

  /** null jika id tidak ditemukan. */
  getCase: (id: string): IAdminCase | null => {
    requireAdmin();
    return listAllCases().find((item) => item.id === id) ?? null;
  },

  /** id null = case baru. Terbitkan memakai validasi penuh; draft cukup berjudul. */
  saveCase: (id: string | null, payload: IAdminCaseSavePayload): IAdminCase => {
    requireAdmin();
    const existing = id ? listAllCases().find((item) => item.id === id) : null;
    if (id && !existing) throw new ApiResponseError(404, 'Case tidak ditemukan.');
    // AI case dinilai AI: tanpa mitra dan reviewer.
    const input: IAdminCaseInput =
      payload.input.tier === 'b2b' ? payload.input : { ...payload.input, partnerId: '' };
    validate({ ...payload, input });
    const reviewerIds = getAssignmentsForPartner(existing?.id ?? null, input.partnerId);
    const saved = mockDb.saveAdminCase({
      ...input,
      id: existing?.id ?? `c-admin-${crypto.randomUUID().slice(0, 8)}`,
      status: payload.isPublish ? 'published' : 'draft',
      updatedAt: new Date().toISOString(),
    });
    mockDb.setCaseReviewers(saved.id, reviewerIds);
    return saved;
  },
};
