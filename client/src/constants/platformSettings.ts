import type { IPlatformSettings, TPlatformSettingKey } from '@/types';
import { PAYMENT_WINDOW_HOURS } from './payment';
import { RECOMMENDATION_THRESHOLD, REVIEW_SLA_BUSINESS_DAYS } from './review';
import { SITE } from './site';

// Nilai bawaan platform (CONTEXT.md bagian 7) dan aturan isiannya. Dipakai halaman Pengaturan
// dan validasi di server tiruan, agar batas angkanya sama di kedua sisi.

export const DEFAULT_PLATFORM_SETTINGS: IPlatformSettings = {
  reviewSlaDays: REVIEW_SLA_BUSINESS_DAYS,
  maxRevisions: 2,
  revisionExtraDays: 3,
  recommendationThreshold: RECOMMENDATION_THRESHOLD,
  passingScoreAi: 60,
  passingScoreB2b: 70,
  b2bStartWindowDays: 30,
  paymentWindowHours: PAYMENT_WINDOW_HOURS,
  whatsappNumber: SITE.whatsappUrl.replace('https://wa.me/', ''),
};

export interface INumberSettingMeta {
  key: Exclude<TPlatformSettingKey, 'whatsappNumber'>;
  label: string;
  hint: string;
  unit: string;
  min: number;
  max: number;
}

export interface ISettingGroup {
  id: string;
  title: string;
  description: string;
  fields: INumberSettingMeta[];
}

export const SETTING_GROUPS: ISettingGroup[] = [
  {
    id: 'review',
    title: 'Review B2B',
    description: 'Janji ke peserta soal waktu dan cara submission B2B dinilai praktisi mitra.',
    fields: [
      {
        key: 'reviewSlaDays',
        label: 'SLA review',
        hint: 'Dihitung dari submit terakhir. Tampil ke peserta sebagai perkiraan waktu.',
        unit: 'hari kerja',
        min: 1,
        max: 15,
      },
      {
        key: 'maxRevisions',
        label: 'Batas pengembalian revisi',
        hint: 'Setelah batas ini reviewer wajib menilai apa adanya.',
        unit: 'kali',
        min: 0,
        max: 5,
      },
      {
        key: 'revisionExtraDays',
        label: 'Tambahan tenggat revisi',
        hint: 'Waktu peserta memperbaiki submission yang dikembalikan.',
        unit: 'hari',
        min: 1,
        max: 14,
      },
      {
        key: 'recommendationThreshold',
        label: 'Saran skor rekomendasi interview',
        hint: 'Hanya saran untuk reviewer; keputusan akhir tetap di reviewer.',
        unit: 'poin',
        min: 50,
        max: 100,
      },
    ],
  },
  {
    id: 'case',
    title: 'Case dan pengerjaan',
    description: 'Nilai awal saat admin membuat case baru; tiap case tetap bisa diatur sendiri.',
    fields: [
      {
        key: 'passingScoreAi',
        label: 'Ambang lulus AI case',
        hint: 'Nilai awal di pembuat case.',
        unit: 'poin',
        min: 1,
        max: 100,
      },
      {
        key: 'passingScoreB2b',
        label: 'Ambang lulus B2B case',
        hint: 'Nilai awal di pembuat case.',
        unit: 'poin',
        min: 1,
        max: 100,
      },
      {
        key: 'b2bStartWindowDays',
        label: 'Batas mulai B2B setelah dibeli',
        hint: 'Peserta harus klik Mulai mengerjakan sebelum batas ini.',
        unit: 'hari',
        min: 7,
        max: 180,
      },
    ],
  },
  {
    id: 'payment',
    title: 'Pembayaran',
    description: 'Mengikuti pengaturan di payment gateway.',
    fields: [
      {
        key: 'paymentWindowHours',
        label: 'Batas waktu bayar',
        hint: 'Order virtual account yang tidak dibayar dalam waktu ini kedaluwarsa.',
        unit: 'jam',
        min: 1,
        max: 72,
      },
    ],
  },
];

export const NUMBER_SETTINGS = SETTING_GROUPS.flatMap((group) => group.fields);

export const SETTING_LABEL: Record<TPlatformSettingKey, string> = {
  ...(Object.fromEntries(NUMBER_SETTINGS.map((field) => [field.key, field.label])) as Record<
    INumberSettingMeta['key'],
    string
  >),
  whatsappNumber: 'Nomor WhatsApp Bantuan',
};

/** 10-15 digit, diawali kode negara 62. */
export const WHATSAPP_PATTERN = /^62\d{8,13}$/;
