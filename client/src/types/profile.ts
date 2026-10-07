import type { IUser, TStudentStatus } from './auth';
import type { TShareConsent } from './result';

// Kontrak data halaman Profil (prototype/CONTEXT.md 4.4 dan 4.12).

/** Jenis notifikasi sesuai CONTEXT.md 4.12. */
export type TNotificationEvent = 'payment' | 'deadline' | 'revision' | 'result' | 'interview';
export type TNotificationChannel = 'email' | 'inApp';
export type TNotificationPreferences = Record<
  TNotificationEvent,
  Record<TNotificationChannel, boolean>
>;

/** Sikap bawaan saat reviewer merekomendasikan ke daftar prioritas interview mitra. */
export type TShareDefault = 'ask' | 'always' | 'never';

/** Satu permintaan berbagi profil dari case yang direkomendasikan reviewer. */
export interface ISharedProfile {
  enrollmentId: string;
  caseTitle: string;
  partnerName: string;
  consent: TShareConsent;
}

export interface IProfile {
  user: IUser;
  institution: string | null;
  linkedinUrl: string | null;
  notifications: TNotificationPreferences;
  shareDefault: TShareDefault;
  sharedProfiles: ISharedProfile[];
}

export interface IProfileDetailsPayload {
  name: string;
  institution: string | null;
  major: string | null;
  studentStatus: TStudentStatus;
  linkedinUrl: string | null;
  fieldKeys: string[];
}
