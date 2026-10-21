import type { TShareConsent } from './result';

// Kontrak data menu Talent pool, Bidang studi, dan Pengaturan panel admin (CONTEXT.md 4.13).

/** Kandidat yang direkomendasikan reviewer ke daftar prioritas interview (CONTEXT.md 4.8). */
export interface ITalentCandidate {
  /** Id enrollment B2B yang direkomendasikan. */
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  fieldKeys: string[];
  caseId: string;
  caseTitle: string;
  partnerId: string | null;
  partnerName: string | null;
  reviewerName: string | null;
  reviewerRole: string;
  score: number;
  recommendedAt: string;
  /** Persetujuan mahasiswa untuk membagikan profil ke mitra. */
  consent: TShareConsent;
  /** Kapan admin meneruskan profil ke mitra; hanya bisa setelah disetujui. */
  sharedAt: string | null;
}

export interface IAdminField {
  /** Dikirim ke backend dan disimpan di case serta profil member; tidak bisa diubah. */
  key: string;
  label: string;
  description: string;
  /** Bidang nonaktif tidak bisa dipilih untuk case atau onboarding baru. */
  isActive: boolean;
  /** Urutan tampil di onboarding dan filter katalog. */
  order: number;
  caseCount: number;
  memberCount: number;
}

export interface IAdminFieldInput {
  label: string;
  description: string;
}

/** Nilai bawaan platform; dulu konstanta di kode dan CONTEXT.md bagian 7. */
export interface IPlatformSettings {
  reviewSlaDays: number;
  maxRevisions: number;
  revisionExtraDays: number;
  recommendationThreshold: number;
  passingScoreAi: number;
  passingScoreB2b: number;
  b2bStartWindowDays: number;
  paymentWindowHours: number;
  /** Nomor WhatsApp untuk tombol Bantuan, format internasional tanpa +, mis. 6281234567890. */
  whatsappNumber: string;
}

export type TPlatformSettingKey = keyof IPlatformSettings;

export interface ISettingsChange {
  key: TPlatformSettingKey;
  label: string;
  from: string;
  to: string;
}

export interface ISettingsLogEntry {
  id: string;
  at: string;
  actorName: string;
  changes: ISettingsChange[];
}

export interface IAdminSettings {
  values: IPlatformSettings;
  defaults: IPlatformSettings;
  /** Riwayat perubahan, terbaru dulu. */
  log: ISettingsLogEntry[];
}
