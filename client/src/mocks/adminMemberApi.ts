import { getPartnerName, listAllCases } from '@/mocks/adminCaseStore';
import { requireAdmin } from '@/mocks/adminGuard';
import { expireOverdueOrders } from '@/mocks/checkoutApi';
import { mockDb, type IMockEnrollmentRecord, type IMockOrderRecord } from '@/mocks/db';
import { settleAiGradings } from '@/mocks/grading';
import type {
  IAdminCase,
  IAdminMemberCertificate,
  IAdminMemberDetail,
  IAdminMemberEnrollment,
  IAdminMemberSummary,
  IAdminOrder,
  TEnrollmentStatus,
} from '@/types';

// Menu Member dan Order panel admin untuk mode mock (CONTEXT.md 4.13). Digabung ke adminApi.

const ACTIVE_STATUSES: TEnrollmentStatus[] = [
  'in_progress',
  'ai_grading',
  'in_review',
  'revision_requested',
];
const REVIEW_STATUSES: TEnrollmentStatus[] = [
  'ai_grading',
  'in_review',
  'revision_requested',
  'passed',
  'failed',
];
/** Akun lama tanpa waktu daftar (mis. disalin dari backend) memakai tanggal ini. */
const FALLBACK_JOINED_AT = '2026-09-01T00:00:00.000Z';

type TUserRecord = NonNullable<ReturnType<typeof mockDb.findUserById>>;

function getContext() {
  // Status yang berubah karena waktu (penilaian AI selesai, order lewat batas) dirapikan dulu.
  settleAiGradings(mockDb.listAllEnrollments());
  expireOverdueOrders();
  return { caseById: new Map(listAllCases().map((item) => [item.id, item])) };
}

function toOrder(order: IMockOrderRecord, caseById: Map<string, IAdminCase>): IAdminOrder {
  const member = mockDb.findUserById(order.userId);
  const adminCase = caseById.get(order.caseId);
  return {
    id: order.id,
    invoiceNumber: order.invoiceNumber,
    memberId: order.userId,
    memberName: member?.name ?? 'Member',
    memberEmail: member?.email ?? '',
    caseId: order.caseId,
    caseTitle: adminCase?.title ?? 'Case',
    partnerName: adminCase ? getPartnerName(adminCase.partnerId) : null,
    method: order.method,
    status: order.status,
    subtotal: order.subtotal,
    adminFee: order.adminFee,
    total: order.total,
    createdAt: order.createdAt,
    expiresAt: order.expiresAt,
    paidAt: order.paidAt,
    vaNumber: order.vaNumber,
  };
}

function toSummary(
  user: TUserRecord,
  enrollments: IMockEnrollmentRecord[],
  caseById: Map<string, IAdminCase>
): IAdminMemberSummary {
  const owned = enrollments.filter((record) => record.userId === user.id);
  const tierCount = (tier: 'ai' | 'b2b') =>
    owned.filter((record) => caseById.get(record.caseId)?.tier === tier).length;
  const lastActiveAt = owned.reduce<string | null>(
    (latest, record) => (!latest || record.updatedAt > latest ? record.updatedAt : latest),
    null
  );
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    studentStatus: user.studentStatus,
    major: user.major,
    fieldKeys: user.fieldKeys,
    joinedAt: user.createdAt ?? FALLBACK_JOINED_AT,
    lastActiveAt,
    aiCaseCount: tierCount('ai'),
    b2bCaseCount: tierCount('b2b'),
    activeCaseCount: owned.filter((record) => ACTIVE_STATUSES.includes(record.status)).length,
    certificateCount: owned.filter(
      (record) => record.certificateId && !record.certificateRevocation
    ).length,
    totalSpent: mockDb
      .listAllOrders()
      .filter((order) => order.userId === user.id && order.status === 'paid')
      .reduce((total, order) => total + order.total, 0),
  };
}

function toEnrollment(
  record: IMockEnrollmentRecord,
  caseById: Map<string, IAdminCase>
): IAdminMemberEnrollment[] {
  const adminCase = caseById.get(record.caseId);
  if (!adminCase) return [];
  return [
    {
      id: record.id,
      caseId: adminCase.id,
      caseTitle: adminCase.title,
      tier: adminCase.tier,
      partnerName: getPartnerName(adminCase.partnerId),
      status: record.status,
      score: record.score,
      updatedAt: record.updatedAt,
      hasReview: REVIEW_STATUSES.includes(record.status),
    },
  ];
}

function toCertificate(
  record: IMockEnrollmentRecord,
  caseById: Map<string, IAdminCase>
): IAdminMemberCertificate[] {
  const adminCase = caseById.get(record.caseId);
  if (!adminCase || !record.certificateId || record.score === null) return [];
  return [
    {
      id: record.certificateId,
      enrollmentId: record.id,
      caseTitle: adminCase.title,
      tier: adminCase.tier,
      score: record.score,
      issuedAt: record.issuedAt ?? record.updatedAt,
      revokedAt: record.certificateRevocation?.revokedAt ?? null,
    },
  ];
}

const listStudents = () => mockDb.listAllUsers().filter((user) => user.role === 'student');

export const adminMemberApi = {
  listMembers: (): IAdminMemberSummary[] => {
    requireAdmin();
    const { caseById } = getContext();
    const enrollments = mockDb.listAllEnrollments();
    return listStudents()
      .map((user) => toSummary(user, enrollments, caseById))
      .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
  },

  /** null jika id tidak ditemukan atau bukan akun mahasiswa. */
  getMember: (id: string): IAdminMemberDetail | null => {
    requireAdmin();
    const user = listStudents().find((item) => item.id === id);
    if (!user) return null;
    const { caseById } = getContext();
    const enrollments = mockDb.listAllEnrollments();
    const owned = enrollments
      .filter((record) => record.userId === user.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return {
      member: {
        ...toSummary(user, enrollments, caseById),
        institution: user.profile?.institution ?? null,
        linkedinUrl: user.profile?.linkedinUrl ?? null,
        shareDefault: user.profile?.shareDefault ?? 'ask',
      },
      enrollments: owned.flatMap((record) => toEnrollment(record, caseById)),
      orders: mockDb
        .listAllOrders()
        .filter((order) => order.userId === user.id)
        .map((order) => toOrder(order, caseById))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      certificates: owned
        .flatMap((record) => toCertificate(record, caseById))
        .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
    };
  },

  /** Semua order dari payment gateway, terbaru dulu. Admin hanya memantau. */
  listOrders: (): IAdminOrder[] => {
    requireAdmin();
    const { caseById } = getContext();
    return mockDb
      .listAllOrders()
      .map((order) => toOrder(order, caseById))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
};
