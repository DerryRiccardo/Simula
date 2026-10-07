import { DEFAULT_NOTIFICATIONS } from '@/constants/profile';
import { MAX_ONBOARDING_FIELDS } from '@/constants/fields';
import { findCaseById } from '@/mocks/data/cases';
import { mockDb, toPublicUser } from '@/mocks/db';
import { learningApi } from '@/mocks/learningApi';
import { resolveReview } from '@/mocks/resultApi';
import type {
  IProfile,
  IProfileDetailsPayload,
  ISharedProfile,
  TNotificationPreferences,
  TShareDefault,
} from '@/types';

// Logika halaman Profil untuk mode mock. Dipakai service saat mock aktif dan oleh handler MSW.

const LINKEDIN_URL = /^https:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/i;

function requireUser() {
  const user = mockDb.getSessionUser();
  if (!user) throw new Error('Silakan masuk terlebih dahulu.');
  return user;
}

/** Rekomendasi interview yang pernah diterima, beserta keputusan berbagi profilnya. */
function listSharedProfiles(userId: string): ISharedProfile[] {
  return mockDb.listEnrollments(userId).flatMap((record) => {
    const caseSummary = findCaseById(record.caseId);
    const detail = caseSummary ? learningApi.getCaseBySlug(caseSummary.slug) : null;
    if (!caseSummary || !detail?.partner) return [];
    if (!resolveReview(record, detail)?.isRecommended) return [];
    return [
      {
        enrollmentId: record.id,
        caseTitle: caseSummary.title,
        partnerName: detail.partner.name,
        consent: record.shareConsent ?? 'pending',
      },
    ];
  });
}

function buildProfile(userId: string): IProfile {
  const record = mockDb.findUserById(userId);
  if (!record) throw new Error('Pengguna tidak ditemukan.');
  const settings = record.profile ?? {};
  return {
    user: toPublicUser(record),
    institution: settings.institution ?? null,
    linkedinUrl: settings.linkedinUrl ?? null,
    notifications: settings.notifications ?? DEFAULT_NOTIFICATIONS,
    shareDefault: settings.shareDefault ?? 'ask',
    sharedProfiles: listSharedProfiles(userId),
  };
}

const toNullable = (value: string | null) => value?.trim() || null;

export const profileApi = {
  getProfile: (): IProfile => buildProfile(requireUser().id),

  /** Validasi ulang di sisi "server": jangan percaya validasi form saja. */
  updateDetails: (payload: IProfileDetailsPayload): IProfile => {
    const user = requireUser();
    const name = payload.name.trim();
    const linkedinUrl = toNullable(payload.linkedinUrl);
    if (name.length < 3) throw new Error('Nama minimal 3 karakter.');
    if (payload.fieldKeys.length < 1 || payload.fieldKeys.length > MAX_ONBOARDING_FIELDS) {
      throw new Error(`Pilih 1 sampai ${MAX_ONBOARDING_FIELDS} bidang.`);
    }
    if (linkedinUrl && !LINKEDIN_URL.test(linkedinUrl)) {
      throw new Error('Tautan LinkedIn tidak valid.');
    }
    mockDb.updateUser(user.id, {
      name,
      major: toNullable(payload.major),
      studentStatus: payload.studentStatus,
      fieldKeys: payload.fieldKeys,
    });
    mockDb.updateUserProfile(user.id, {
      institution: toNullable(payload.institution),
      linkedinUrl,
    });
    return buildProfile(user.id);
  },

  updateNotifications: (notifications: TNotificationPreferences): IProfile => {
    const user = requireUser();
    mockDb.updateUserProfile(user.id, { notifications });
    return buildProfile(user.id);
  },

  /** Berlaku untuk rekomendasi berikutnya; keputusan per mitra yang sudah ada tidak berubah. */
  updateShareDefault: (shareDefault: TShareDefault): IProfile => {
    const user = requireUser();
    mockDb.updateUserProfile(user.id, { shareDefault });
    return buildProfile(user.id);
  },
};

/** Status awal persetujuan saat reviewer merekomendasikan, mengikuti pengaturan Profil. */
export function getInitialShareConsent(userId: string) {
  const shareDefault = mockDb.findUserById(userId)?.profile?.shareDefault ?? 'ask';
  if (shareDefault === 'always') return 'granted' as const;
  if (shareDefault === 'never') return 'declined' as const;
  return 'pending' as const;
}
