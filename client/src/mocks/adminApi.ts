import { ApiResponseError } from '@/lib/apiError';
import { getCaseBrief } from '@/mocks/data/caseBriefs';
import { CASE_DETAILS } from '@/mocks/data/caseDetails';
import { CASES } from '@/mocks/data/cases';
import { mockDb } from '@/mocks/db';
import type {
  IAdminCase,
  IAdminCaseSavePayload,
  IAdminCaseSummary,
  ICaseDetail,
  ICaseSummary,
} from '@/types';

// Logika panel admin untuk mode mock. Dipakai service saat mock aktif dan oleh handler MSW.
// PLACEHOLDER: case contoh tampil sebagai "terbit". Case yang dibuat atau disunting admin
// tersimpan di panel ini saja; katalog mahasiswa baru memakainya setelah backend tersedia.

function requireAdmin() {
  const user = mockDb.getSessionUser();
  if (!user) throw new ApiResponseError(401, 'Silakan masuk terlebih dahulu.');
  if (user.role !== 'admin') throw new ApiResponseError(403, 'Halaman ini khusus admin.');
}

/** Case contoh dalam bentuk isian pembuat case. */
function fromSeed(summary: ICaseSummary): IAdminCase {
  const content = CASE_DETAILS[summary.id];
  const detail: ICaseDetail = { ...summary, ...content, myEnrollment: null };
  const brief = getCaseBrief(detail);
  return {
    id: summary.id,
    status: 'published',
    updatedAt: '2026-09-01T09:00:00.000Z',
    tier: summary.tier,
    title: summary.title,
    fieldKey: summary.fieldKey,
    level: summary.level,
    durationLabel: summary.durationLabel,
    summary: summary.summary,
    context: brief.context.join('\n\n'),
    tasks: brief.tasks,
    materials: brief.materials.map(({ name, format, description }) => ({
      name,
      format,
      description,
    })),
    slots: brief.slots.map((slot) => ({
      title: slot.title,
      description: slot.description,
      kind: slot.kind,
      isRequired: slot.isRequired,
      formats: slot.formats?.join(', ') ?? '',
      maxSizeMb: slot.maxSizeMb ?? 10,
    })),
    rubric: brief.rubric,
    passingScore: brief.passingScore,
    price: summary.price ?? 0,
    deadlineDays: brief.deadlineDays ?? 0,
    partnerName: detail.partner?.name ?? '',
    partnerIndustry: detail.partner?.industry ?? '',
    reviewerRole: detail.reviewerRole ?? '',
  };
}

/** Case contoh (atau versi suntingannya) lalu case baru buatan admin. */
function listAllCases(): IAdminCase[] {
  const saved = new Map(mockDb.listAdminCases().map((item) => [item.id, item]));
  const seeds = CASES.map((summary) => saved.get(summary.id) ?? fromSeed(summary));
  const created = mockDb.listAdminCases().filter((item) => !CASES.some((c) => c.id === item.id));
  return [...created, ...seeds];
}

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
    partnerName: item.tier === 'b2b' ? item.partnerName || null : null,
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
  if (input.tier === 'b2b' && (!input.partnerName.trim() || input.price <= 0)) {
    throw new ApiResponseError(422, 'B2B case wajib punya mitra dan harga.');
  }
}

export const adminApi = {
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
    validate(payload);
    return mockDb.saveAdminCase({
      ...payload.input,
      id: existing?.id ?? `c-admin-${crypto.randomUUID().slice(0, 8)}`,
      status: payload.isPublish ? 'published' : 'draft',
      updatedAt: new Date().toISOString(),
    });
  },
};
