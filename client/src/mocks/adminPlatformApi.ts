import {
  DEFAULT_PLATFORM_SETTINGS,
  NUMBER_SETTINGS,
  SETTING_LABEL,
  WHATSAPP_PATTERN,
} from '@/constants/platformSettings';
import { ApiResponseError } from '@/lib/apiError';
import { getPartnerName, listAllCases } from '@/mocks/adminCaseStore';
import { requireAdmin } from '@/mocks/adminGuard';
import { mockDb, type IMockField } from '@/mocks/db';
import { getCaseContext } from '@/mocks/grading';
import { resolveReview } from '@/mocks/resultApi';
import { getEffectiveReviewerId } from '@/mocks/reviewerAssignments';
import type {
  IAdminField,
  IAdminFieldInput,
  IAdminSettings,
  IFieldError,
  IPlatformSettings,
  ISettingsChange,
  ITalentCandidate,
  TPlatformSettingKey,
} from '@/types';

// Menu Talent pool, Bidang studi, dan Pengaturan panel admin untuk mode mock. Digabung ke adminApi.

// --- Talent pool ---

function listCandidates(): ITalentCandidate[] {
  const caseById = new Map(listAllCases().map((item) => [item.id, item]));
  return mockDb.listAllEnrollments().flatMap((record): ITalentCandidate[] => {
    const adminCase = caseById.get(record.caseId);
    const context = getCaseContext(record.caseId);
    if (adminCase?.tier !== 'b2b' || record.status !== 'passed' || !context) return [];
    const review = resolveReview(record, context.detail);
    if (!review?.isRecommended || record.score === null) return [];
    const member = mockDb.findUserById(record.userId);
    const reviewer = mockDb.findUserById(getEffectiveReviewerId(record) ?? '');
    return [
      {
        id: record.id,
        memberId: record.userId,
        memberName: member?.name ?? 'Member',
        memberEmail: member?.email ?? '',
        fieldKeys: member?.fieldKeys ?? [],
        caseId: adminCase.id,
        caseTitle: adminCase.title,
        partnerId: adminCase.partnerId || null,
        partnerName: getPartnerName(adminCase.partnerId),
        reviewerName: reviewer?.name ?? null,
        reviewerRole: review.reviewerRole,
        score: record.score,
        recommendedAt: review.reviewedAt,
        consent: record.shareConsent ?? 'pending',
        sharedAt: record.profileSharedAt ?? null,
      },
    ];
  });
}

// --- Bidang studi ---

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function toAdminFields(): IAdminField[] {
  const cases = listAllCases();
  const students = mockDb.listAllUsers().filter((user) => user.role === 'student');
  return mockDb.listFields().map((field) => ({
    ...field,
    caseCount: cases.filter((item) => item.fieldKey === field.key).length,
    memberCount: students.filter((user) => user.fieldKeys.includes(field.key)).length,
  }));
}

function validateField(input: IAdminFieldInput, currentKey: string | null) {
  const errors: IFieldError[] = [];
  if (input.label.trim().length < 2) {
    errors.push({ field: 'label', message: 'Tulis minimal 2 karakter.' });
  }
  if (input.description.trim().length < 5) {
    errors.push({ field: 'description', message: 'Tulis minimal 5 karakter.' });
  }
  const label = input.label.trim().toLowerCase();
  if (
    mockDb
      .listFields()
      .some((item) => item.key !== currentKey && item.label.toLowerCase() === label)
  ) {
    errors.push({ field: 'label', message: 'Bidang dengan nama ini sudah ada.' });
  }
  if (errors.length > 0) throw new ApiResponseError(422, errors[0].message, errors);
}

function updateField(key: string, update: (field: IMockField) => IMockField) {
  const fields = mockDb.listFields();
  if (!fields.some((item) => item.key === key)) {
    throw new ApiResponseError(404, 'Bidang tidak ditemukan.');
  }
  mockDb.saveFields(fields.map((item) => (item.key === key ? update(item) : item)));
}

// --- Pengaturan ---

const formatSetting = (key: TPlatformSettingKey, value: IPlatformSettings[TPlatformSettingKey]) => {
  if (key === 'whatsappNumber') return `+${value}`;
  const meta = NUMBER_SETTINGS.find((item) => item.key === key);
  return `${value} ${meta?.unit ?? ''}`.trim();
};

function validateSettings(values: IPlatformSettings) {
  const errors: IFieldError[] = NUMBER_SETTINGS.flatMap((meta) => {
    const value = values[meta.key];
    return Number.isInteger(value) && value >= meta.min && value <= meta.max
      ? []
      : [{ field: meta.key, message: `Isi bilangan bulat ${meta.min} sampai ${meta.max}.` }];
  });
  if (!WHATSAPP_PATTERN.test(values.whatsappNumber)) {
    errors.push({
      field: 'whatsappNumber',
      message: 'Gunakan format 62xxxxxxxxxx tanpa spasi atau tanda +.',
    });
  }
  if (errors.length > 0) throw new ApiResponseError(422, errors[0].message, errors);
}

const getSettings = (): IAdminSettings => ({
  values: mockDb.getSettings(),
  defaults: DEFAULT_PLATFORM_SETTINGS,
  log: mockDb.listSettingsLog(),
});

export const adminPlatformApi = {
  listTalentPool: (): ITalentCandidate[] => {
    requireAdmin();
    return listCandidates().sort((a, b) => b.recommendedAt.localeCompare(a.recommendedAt));
  },

  /** Teruskan profil kandidat ke mitra. Hanya boleh bila kandidat sudah menyetujui. */
  shareTalent: (id: string): ITalentCandidate => {
    requireAdmin();
    const candidate = listCandidates().find((item) => item.id === id);
    if (!candidate) throw new ApiResponseError(404, 'Kandidat tidak ditemukan di talent pool.');
    if (candidate.consent !== 'granted') {
      throw new ApiResponseError(409, 'Kandidat belum menyetujui profilnya dibagikan ke mitra.');
    }
    if (candidate.sharedAt) {
      throw new ApiResponseError(409, 'Profil kandidat ini sudah diteruskan ke mitra.');
    }
    const sharedAt = new Date().toISOString();
    mockDb.updateEnrollment(id, { profileSharedAt: sharedAt }, { isTouch: false });
    return { ...candidate, sharedAt };
  },

  listFields: (): IAdminField[] => {
    requireAdmin();
    return toAdminFields();
  },

  createField: (input: IAdminFieldInput): IAdminField => {
    requireAdmin();
    validateField(input, null);
    const fields = mockDb.listFields();
    const base = slugify(input.label) || 'bidang';
    let key = base;
    for (let index = 2; fields.some((item) => item.key === key); index += 1)
      key = `${base}-${index}`;
    mockDb.saveFields([
      ...fields,
      {
        key,
        label: input.label.trim(),
        description: input.description.trim(),
        isActive: true,
        order: fields.length,
      },
    ]);
    const created = toAdminFields().find((item) => item.key === key);
    if (!created) throw new ApiResponseError(500, 'Bidang gagal dibuat.');
    return created;
  },

  /** Label dan deskripsi bisa diubah; key tetap karena dipakai case dan profil member. */
  updateField: (key: string, input: IAdminFieldInput): IAdminField[] => {
    requireAdmin();
    validateField(input, key);
    updateField(key, (field) => ({
      ...field,
      label: input.label.trim(),
      description: input.description.trim(),
    }));
    return toAdminFields();
  },

  /** Nonaktif: tidak bisa dipilih untuk case atau onboarding baru; data lama tetap utuh. */
  setFieldActive: (key: string, isActive: boolean): IAdminField[] => {
    requireAdmin();
    if (!isActive && mockDb.listFields().filter((item) => item.isActive).length <= 1) {
      throw new ApiResponseError(409, 'Minimal satu bidang harus tetap aktif.');
    }
    updateField(key, (field) => ({ ...field, isActive }));
    return toAdminFields();
  },

  /** Tukar urutan dengan bidang di atas (-1) atau di bawahnya (1). */
  moveField: (key: string, direction: -1 | 1): IAdminField[] => {
    requireAdmin();
    const fields = mockDb.listFields();
    const index = fields.findIndex((item) => item.key === key);
    const target = index + direction;
    if (index === -1) throw new ApiResponseError(404, 'Bidang tidak ditemukan.');
    if (target < 0 || target >= fields.length) return toAdminFields();
    const reordered = [...fields];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    mockDb.saveFields(reordered.map((field, order) => ({ ...field, order })));
    return toAdminFields();
  },

  getSettings: (): IAdminSettings => {
    requireAdmin();
    return getSettings();
  },

  /** Simpan nilai baru; hanya nilai yang berubah yang dicatat di riwayat. */
  saveSettings: (values: IPlatformSettings): IAdminSettings => {
    const admin = requireAdmin();
    const next: IPlatformSettings = { ...values, whatsappNumber: values.whatsappNumber.trim() };
    validateSettings(next);
    const current = mockDb.getSettings();
    const changes: ISettingsChange[] = (Object.keys(SETTING_LABEL) as TPlatformSettingKey[])
      .filter((key) => current[key] !== next[key])
      .map((key) => ({
        key,
        label: SETTING_LABEL[key],
        from: formatSetting(key, current[key]),
        to: formatSetting(key, next[key]),
      }));
    if (changes.length === 0) throw new ApiResponseError(409, 'Tidak ada nilai yang berubah.');
    mockDb.saveSettings(next, {
      id: `log-${crypto.randomUUID().slice(0, 8)}`,
      at: new Date().toISOString(),
      actorName: admin.name,
      changes,
    });
    return getSettings();
  },
};
