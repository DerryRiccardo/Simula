import { CASE_DETAILS } from '@/mocks/data/caseDetails';
import { CASES, findCaseById } from '@/mocks/data/cases';
import { mockDb, type IMockEnrollmentRecord } from '@/mocks/db';
import { settleAiGradings } from '@/mocks/grading';
import type {
  ICaseDetail,
  ICaseListParams,
  ICaseSummary,
  ICertificate,
  IDashboardSummary,
  IEnrollment,
  IEnrollmentListParams,
  IPaginatedResponse,
  TCaseSort,
  TEnrollmentSort,
  TEnrollmentStatus,
  TTier,
} from '@/types';

// Logika data pembelajaran untuk mode mock (prototype). Dipanggil langsung oleh service saat
// NEXT_PUBLIC_API_MOCKING aktif, dan juga oleh handler MSW agar kontrak API tetap terdokumentasi.

const ACTION_STATUSES: TEnrollmentStatus[] = [
  'revision_requested',
  'pending_payment',
  'in_progress',
  'not_started',
];
const ACTIVE_STATUSES: TEnrollmentStatus[] = [...ACTION_STATUSES, 'ai_grading', 'in_review'];

function toEnrollment(record: IMockEnrollmentRecord): IEnrollment | null {
  const caseSummary = findCaseById(record.caseId);
  if (!caseSummary) return null;
  const { id, status, deadlineAt, updatedAt, score, certificateId } = record;
  return { id, caseSummary, status, deadlineAt, updatedAt, score, certificateId };
}

const isEnrollment = (value: IEnrollment | null): value is IEnrollment => value !== null;

const byUpdatedDesc = (a: { updatedAt: string }, b: { updatedAt: string }) =>
  b.updatedAt.localeCompare(a.updatedAt);

const getSessionEnrollments = () => {
  const user = mockDb.getSessionUser();
  if (!user) return null;
  // Penilaian AI yang waktunya habis diselesaikan dulu agar daftar langsung menampilkan hasilnya.
  settleAiGradings(mockDb.listEnrollments(user.id));
  return { user, records: mockDb.listEnrollments(user.id) };
};

function getRecommendations(userFields: string[], enrolledIds: Set<string>, preferTier: TTier) {
  const score = (item: ICaseSummary) =>
    (userFields.includes(item.fieldKey) ? 2 : 0) + (item.tier === preferTier ? 1 : 0);
  return CASES.filter((item) => !enrolledIds.has(item.id))
    .sort((a, b) => score(b) - score(a) || b.participantCount - a.participantCount)
    .slice(0, 3);
}

function getEnrollmentComparator(sort: TEnrollmentSort) {
  switch (sort) {
    case 'deadline':
      // Yang punya tenggat paling dekat lebih dulu; tanpa tenggat di akhir.
      return (a: IEnrollment, b: IEnrollment) =>
        (a.deadlineAt ?? '9999').localeCompare(b.deadlineAt ?? '9999') || byUpdatedDesc(a, b);
    case 'title':
      return (a: IEnrollment, b: IEnrollment) =>
        a.caseSummary.title.localeCompare(b.caseSummary.title, 'id');
    default:
      return byUpdatedDesc;
  }
}

function getCaseComparator(sort: TCaseSort, userFields: string[]) {
  switch (sort) {
    case 'popular':
      return (a: ICaseSummary, b: ICaseSummary) => b.participantCount - a.participantCount;
    case 'rating':
      return (a: ICaseSummary, b: ICaseSummary) =>
        b.rating - a.rating || b.participantCount - a.participantCount;
    case 'price_low':
      return (a: ICaseSummary, b: ICaseSummary) => (a.price ?? 0) - (b.price ?? 0);
    default:
      // Relevansi: case di bidang pilihan pengguna lebih dulu, lalu yang paling populer.
      return (a: ICaseSummary, b: ICaseSummary) =>
        Number(userFields.includes(b.fieldKey)) - Number(userFields.includes(a.fieldKey)) ||
        b.participantCount - a.participantCount;
  }
}

export const learningApi = {
  listCases: (params: ICaseListParams = {}): IPaginatedResponse<ICaseSummary> => {
    const { tier, field, level, sort = 'relevance', page = 1, limit = 12 } = params;
    const search = params.search?.trim().toLowerCase();
    const userFields = mockDb.getSessionUser()?.fieldKeys ?? [];
    // Jelajahi Case untuk mencari case baru; yang sudah diambil ada di Case Saya.
    const enrolledIds = params.excludeEnrolled
      ? new Set(getSessionEnrollments()?.records.map((record) => record.caseId))
      : null;

    const filtered = CASES.filter(
      (item) =>
        !enrolledIds?.has(item.id) &&
        (!tier || item.tier === tier) &&
        (!field || item.fieldKey === field) &&
        (!level || item.level === level) &&
        (!search ||
          item.title.toLowerCase().includes(search) ||
          item.summary.toLowerCase().includes(search))
    ).sort(getCaseComparator(sort, userFields));

    const totalItems = filtered.length;
    return {
      data: filtered.slice((page - 1) * limit, page * limit),
      metadata: { page, limit, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / limit)) },
    };
  },

  /** null jika slug tidak ditemukan. */
  getCaseBySlug: (slug: string): ICaseDetail | null => {
    const caseSummary = CASES.find((item) => item.slug === slug);
    const content = caseSummary && CASE_DETAILS[caseSummary.id];
    if (!caseSummary || !content) return null;
    const enrollment = getSessionEnrollments()?.records.find(
      (record) => record.caseId === caseSummary.id
    );
    return {
      ...caseSummary,
      ...content,
      myEnrollment: enrollment ? { status: enrollment.status } : null,
    };
  },

  /** Mulai AI case gratis. B2B harus lewat checkout, jadi ditolak di sini. */
  startCase: (caseId: string): IEnrollment => {
    const session = getSessionEnrollments();
    if (!session) throw new Error('Silakan masuk terlebih dahulu.');
    const caseSummary = findCaseById(caseId);
    if (!caseSummary) throw new Error('Case tidak ditemukan.');
    if (caseSummary.tier !== 'ai') throw new Error('B2B Case Study harus dibayar lewat checkout.');
    const existing = session.records.find((record) => record.caseId === caseId);
    const record =
      existing ?? mockDb.addEnrollment({ userId: session.user.id, caseId, status: 'in_progress' });
    const enrollment = toEnrollment(record);
    if (!enrollment) throw new Error('Case tidak ditemukan.');
    return enrollment;
  },

  listEnrollments: (params: IEnrollmentListParams = {}): IEnrollment[] => {
    const { tier, status, field, sort = 'recent' } = params;
    const search = params.search?.trim().toLowerCase();
    const session = getSessionEnrollments();
    if (!session) return [];
    return session.records
      .map(toEnrollment)
      .filter(isEnrollment)
      .filter(
        (item) =>
          (!tier || item.caseSummary.tier === tier) &&
          (!status || item.status === status) &&
          (!field || item.caseSummary.fieldKey === field) &&
          (!search || item.caseSummary.title.toLowerCase().includes(search))
      )
      .sort(getEnrollmentComparator(sort));
  },

  listCertificates: ({ tier }: { tier?: TTier } = {}): ICertificate[] => {
    const session = getSessionEnrollments();
    if (!session) return [];
    return session.records
      .flatMap((record) => {
        const caseSummary = findCaseById(record.caseId);
        if (!caseSummary || !record.certificateId || record.score === null) return [];
        if (tier && caseSummary.tier !== tier) return [];
        return [
          {
            id: record.certificateId,
            caseTitle: caseSummary.title,
            tier: caseSummary.tier,
            fieldKey: caseSummary.fieldKey,
            recipientName: session.user.name,
            partnerName: caseSummary.partnerName,
            score: record.score,
            issuedAt: record.issuedAt ?? record.updatedAt,
          },
        ];
      })
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  },

  getDashboard: (): IDashboardSummary => {
    const session = getSessionEnrollments();
    const user = session?.user;
    const records = session?.records ?? [];
    const enrollments = records.map(toEnrollment).filter(isEnrollment);
    const count = (statuses: TEnrollmentStatus[]) =>
      enrollments.filter((item) => statuses.includes(item.status)).length;
    const hasPassed = (tier: TTier) =>
      enrollments.some((item) => item.caseSummary.tier === tier && item.status === 'passed');
    const hasPassedAiCase = hasPassed('ai');

    return {
      stats: {
        totalCount: enrollments.length,
        statusCounts: enrollments.reduce<Partial<Record<TEnrollmentStatus, number>>>(
          (counts, item) => ({ ...counts, [item.status]: (counts[item.status] ?? 0) + 1 }),
          {}
        ),
        activeCount: count(ACTIVE_STATUSES),
        inReviewCount: count(['in_review', 'ai_grading']),
        revisionCount: count(['revision_requested']),
        certificateCount: records.filter((record) => record.certificateId).length,
      },
      actionItems: enrollments
        .filter((item) => ACTION_STATUSES.includes(item.status))
        .sort((a, b) => ACTION_STATUSES.indexOf(a.status) - ACTION_STATUSES.indexOf(b.status)),
      recommendations: getRecommendations(
        user?.fieldKeys ?? [],
        new Set(records.map((record) => record.caseId)),
        hasPassedAiCase ? 'b2b' : 'ai'
      ),
      hasPassedAiCase,
      hasPassedB2bCase: hasPassed('b2b'),
    };
  },
};
