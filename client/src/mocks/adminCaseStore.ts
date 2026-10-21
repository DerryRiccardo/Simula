import { getCaseBrief } from '@/mocks/data/caseBriefs';
import { CASE_DETAILS } from '@/mocks/data/caseDetails';
import { CASES } from '@/mocks/data/cases';
import { mockDb } from '@/mocks/db';
import type { IAdminCase, ICaseDetail, ICaseSummary } from '@/types';

// Sumber daftar case panel admin (mode mock): case contoh, versi suntingannya, dan case baru.
// PLACEHOLDER: case contoh tampil sebagai "terbit". Case yang dibuat atau disunting admin
// tersimpan di panel ini saja; katalog mahasiswa baru memakainya setelah backend tersedia.

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
    partnerId: findPartnerIdByName(detail.partner?.name ?? ''),
    reviewerRole: detail.reviewerRole ?? '',
  };
}

/** Case contoh menyimpan nama mitra; dicocokkan ke data mitra lewat nama. */
function findPartnerIdByName(name: string) {
  const key = name.trim().toLowerCase();
  if (!key) return '';
  return mockDb.listPartners().find((partner) => partner.name.toLowerCase() === key)?.id ?? '';
}

export const getPartnerName = (partnerId: string) =>
  mockDb.listPartners().find((partner) => partner.id === partnerId)?.name ?? null;

/** Case contoh (atau versi suntingannya) lalu case baru buatan admin. */
export function listAllCases(): IAdminCase[] {
  const saved = new Map(mockDb.listAdminCases().map((item) => [item.id, item]));
  const seeds = CASES.map((summary) => saved.get(summary.id) ?? fromSeed(summary));
  const created = mockDb.listAdminCases().filter((item) => !CASES.some((c) => c.id === item.id));
  return [...created, ...seeds];
}
