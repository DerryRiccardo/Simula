import type {
  TNotificationChannel,
  TNotificationEvent,
  TNotificationPreferences,
  TShareDefault,
} from '@/types';

// Jenis notifikasi sesuai prototype/CONTEXT.md 4.12.
export const NOTIFICATION_EVENTS: {
  value: TNotificationEvent;
  label: string;
  description: string;
}[] = [
  {
    value: 'payment',
    label: 'Pembayaran',
    description: 'Berhasil, menunggu transfer, atau batas waktu habis.',
  },
  {
    value: 'deadline',
    label: 'Tenggat pengerjaan',
    description: 'Pengingat saat tenggat case tinggal 2 hari.',
  },
  {
    value: 'revision',
    label: 'Perlu revisi',
    description: 'Submission dikembalikan reviewer beserta catatannya.',
  },
  { value: 'result', label: 'Hasil review', description: 'Skor dan feedback sudah keluar.' },
  {
    value: 'interview',
    label: 'Kesempatan interview',
    description: 'Reviewer merekomendasikanmu ke daftar prioritas mitra.',
  },
];

export const NOTIFICATION_CHANNELS: { value: TNotificationChannel; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'inApp', label: 'Dashboard' },
];

/** Bawaan: semua aktif. */
export const DEFAULT_NOTIFICATIONS: TNotificationPreferences = {
  payment: { email: true, inApp: true },
  deadline: { email: true, inApp: true },
  revision: { email: true, inApp: true },
  result: { email: true, inApp: true },
  interview: { email: true, inApp: true },
};

export const SHARE_DEFAULT_OPTIONS: { value: TShareDefault; label: string; description: string }[] =
  [
    {
      value: 'ask',
      label: 'Tanya setiap kali',
      description: 'Kamu memutuskan per mitra saat direkomendasikan. Disarankan.',
    },
    {
      value: 'always',
      label: 'Selalu izinkan',
      description: 'Profil langsung dibagikan ke mitra yang merekomendasikanmu.',
    },
    {
      value: 'never',
      label: 'Jangan bagikan',
      description: 'Rekomendasi tetap tercatat, tetapi profilmu tidak dibagikan.',
    },
  ];
