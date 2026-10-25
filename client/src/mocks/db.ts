import type {
  IPartner,
  IPlatformSettings,
  ISettingsLogEntry,
  IAdminCase,
  IAdminFlag,
  IOrder,
  IReviewDraft,
  IReviewResult,
  IRevisionRequest,
  IStatusEvent,
  ISubmissionDraft,
  ISubmissionRecord,
  IUser,
  TEnrollmentStatus,
  TNotificationPreferences,
  TShareConsent,
  TShareDefault,
} from '@/types';
import { DEFAULT_PLATFORM_SETTINGS } from '@/constants/platformSettings';
import { FIELD_OPTIONS } from '@/constants/fields';
import { findCaseById } from './data/cases';
import { DEMO_EMAILS, DEMO_PASSWORD } from './demoAccounts';

// "Database" tiruan untuk mode mock. Disimpan di localStorage agar data bertahan saat reload,
// dan otomatis kembali ke data awal jika storage tidak tersedia.

/** Pengaturan halaman Profil; tidak ikut dikirim di objek IUser. Kosong = pakai nilai bawaan. */
export interface IMockProfileSettings {
  institution?: string | null;
  linkedinUrl?: string | null;
  notifications?: TNotificationPreferences;
  shareDefault?: TShareDefault;
}

/** Data reviewer mitra (tabel reviewer di backend). Hanya untuk akun berperan reviewer. */
export interface IMockReviewerProfile {
  partnerId: string;
  jobTitle: string;
  isActive: boolean;
}

interface IMockUserRecord extends IUser {
  password: string;
  profile?: IMockProfileSettings;
  reviewerProfile?: IMockReviewerProfile;
  /** Waktu daftar; dipakai menu Member panel admin. */
  createdAt?: string;
}

/** Satu baris reviewer_assignments: reviewer boleh menilai submission dari case ini. */
export interface IMockReviewerAssignment {
  caseId: string;
  reviewerId: string;
}

export interface IMockEnrollmentRecord {
  id: string;
  userId: string;
  caseId: string;
  status: TEnrollmentStatus;
  deadlineAt: string | null;
  updatedAt: string;
  score: number | null;
  certificateId: string | null;
  /** Diisi saat sertifikat terbit (status passed). */
  issuedAt: string | null;
  draft?: ISubmissionDraft | null;
  submission?: ISubmissionRecord | null;
  revision?: IRevisionRequest | null;
  /** Riwayat untuk timeline halaman status. */
  events?: IStatusEvent[];
  /** Hasil penilaian. Seed lulus/belum lulus diisi saat pertama dibaca (lihat resultApi). */
  review?: IReviewResult | null;
  shareConsent?: TShareConsent | null;
  /** Draft penilaian reviewer untuk submission ini; dihapus saat keputusan dikirim. */
  reviewDraft?: IReviewDraft | null;
  /** B2B: kesempatan submit ulang setelah belum lulus sudah dipakai (maks. 1 kali). */
  hasRetried?: boolean;
  /** Panel admin: ditandai bermasalah untuk evaluasi penilaian AI. */
  adminFlag?: IAdminFlag | null;
  /** Panel admin: pengingat terakhir ke reviewer (B2B). */
  lastReminderAt?: string | null;
  /** Awal penilaian AI; diisi saat admin menilai ulang (bila kosong: waktu submit). */
  aiGradingStartedAt?: string | null;
  /**
   * B2B: reviewer yang memegang submission ini. Diisi saat admin mengganti reviewer atau saat
   * reviewer memutuskan; bila kosong, reviewer aktif pertama yang ditugaskan ke case.
   */
  assignedReviewerId?: string | null;
  /** Talent pool: kapan admin meneruskan profil ke mitra (setelah peserta setuju). */
  profileSharedAt?: string | null;
}

/** Data master bidang studi (menu Bidang studi). Ikon bidang bawaan diambil dari konstanta. */
export interface IMockField {
  key: string;
  label: string;
  description: string;
  isActive: boolean;
  order: number;
}

export interface IMockOrderRecord extends IOrder {
  userId: string;
}

interface IMockState {
  users: IMockUserRecord[];
  enrollments: IMockEnrollmentRecord[];
  orders: IMockOrderRecord[];
  /** Case buatan atau suntingan admin; case contoh yang belum disunting tidak disimpan. */
  adminCases: IAdminCase[];
  partners: IPartner[];
  reviewerAssignments: IMockReviewerAssignment[];
  fields: IMockField[];
  settings: IPlatformSettings;
  settingsLog: ISettingsLogEntry[];
  sessionUserId: string | null;
}

// Naikkan versi bila bentuk data berubah, agar data lama di localStorage diabaikan.
const STORAGE_KEY = 'ws-mock-db-v13';

const SEED_USERS: IMockUserRecord[] = [
  {
    id: 'u-student',
    name: 'Rahma Aulia',
    email: DEMO_EMAILS.student,
    password: DEMO_PASSWORD,
    role: 'student',
    isOnboarded: true,
    fieldKeys: ['backend', 'data'],
    studentStatus: 'final_year',
    major: 'Sistem Informasi',
  },
  {
    id: 'u-reviewer',
    name: 'Andika Pratama',
    email: DEMO_EMAILS.reviewer,
    password: DEMO_PASSWORD,
    role: 'reviewer',
    isOnboarded: true,
    fieldKeys: ['backend'],
    studentStatus: null,
    major: null,
    reviewerProfile: { partnerId: 'p-sagara', jobTitle: 'Senior Backend Engineer', isActive: true },
  },
  {
    id: 'u-admin',
    name: 'Admin Platform',
    email: DEMO_EMAILS.admin,
    password: DEMO_PASSWORD,
    role: 'admin',
    isOnboarded: true,
    fieldKeys: [],
    studentStatus: null,
    major: null,
  },
];

// PLACEHOLDER: member lain (pemilik submission kandidat dan contoh AI case) agar panel admin punya
// data. Tidak bisa dipakai masuk: password acak, dan hanya akun demo yang ditampilkan di login.
const createSeedMembers = (): IMockUserRecord[] =>
  (
    [
      [
        'u-candidate-1',
        'Nadia Putri Rahmawati',
        'nadia.rahmawati',
        ['backend'],
        'Teknik Informatika',
      ],
      ['u-candidate-2', 'Bagas Wicaksono', 'bagas.wicaksono', ['finance'], 'Akuntansi'],
      ['u-candidate-3', 'Siti Khoirunnisa', 'siti.khoirunnisa', ['data'], 'Statistika'],
      ['u-candidate-4', 'Fikri Hidayat', 'fikri.hidayat', ['backend'], 'Ilmu Komputer'],
      ['u-member-5', 'Clara Wibisono', 'clara.wibisono', ['uiux'], 'Desain Komunikasi Visual'],
      ['u-member-6', 'Yoga Prasetyo', 'yoga.prasetyo', ['marketing'], 'Manajemen'],
      ['u-member-7', 'Arif Ramadhan', 'arif.ramadhan', ['backend'], 'Teknik Informatika'],
      ['u-member-8', 'Dewi Anggraini', 'dewi.anggraini', ['uiux'], 'Desain Produk'],
      ['u-member-9', 'Rizky Firmansyah', 'rizky.firmansyah', ['marketing'], 'Ilmu Komunikasi'],
    ] as const
  ).map(([id, name, handle, fieldKeys, major]) => ({
    id,
    name,
    email: `${handle}@mail.simula.test`,
    password: crypto.randomUUID(),
    role: 'student',
    isOnboarded: true,
    fieldKeys: [...fieldKeys],
    studentStatus: 'final_year',
    major,
  }));

// PLACEHOLDER: mitra dan reviewer contoh. Nama mitra sama dengan data case (mocks/data/caseDetails).
const SEED_PARTNERS: IPartner[] = [
  {
    id: 'p-sagara',
    name: 'Sagara Commerce',
    industry: 'E-commerce',
    about:
      'Marketplace dengan jutaan transaksi per bulan. Tim engineering-nya menangani lonjakan traffic besar setiap kampanye flash sale.',
  },
  {
    id: 'p-samudra',
    name: 'Samudra Logistik',
    industry: 'Logistik',
    about:
      'Penyedia jasa pengiriman antarkota dengan ratusan titik hub di Jawa, Sumatra, dan Sulawesi.',
  },
  {
    id: 'p-kirana',
    name: 'Kirana Retail',
    industry: 'Retail',
    about:
      'Jaringan retail gaya hidup dengan toko fisik dan aplikasi belanja yang terus mengembangkan kanal digitalnya.',
  },
  {
    id: 'p-bentala',
    name: 'Bentala Finance',
    industry: 'Jasa keuangan',
    about:
      'Perusahaan jasa keuangan yang mendampingi bisnis menengah dalam perencanaan modal dan ekspansi.',
  },
];

// Reviewer lain selain akun demo. Tidak bisa dipakai masuk (password acak).
const createSeedReviewers = (): IMockUserRecord[] =>
  (
    [
      [
        'u-rev-maya',
        'Maya Lestari',
        'maya.lestari@sagara.test',
        'p-sagara',
        'Engineering Manager',
        true,
      ],
      [
        'u-rev-hendra',
        'Hendra Gunawan',
        'hendra.gunawan@samudra.test',
        'p-samudra',
        'Lead Data Analyst',
        true,
      ],
      [
        'u-rev-putri',
        'Putri Anjani',
        'putri.anjani@samudra.test',
        'p-samudra',
        'Senior Data Scientist',
        false,
      ],
      [
        'u-rev-dimas',
        'Dimas Saputra',
        'dimas.saputra@kirana.test',
        'p-kirana',
        'Product Design Lead',
        true,
      ],
      [
        'u-rev-laras',
        'Laras Wulandari',
        'laras.wulandari@kirana.test',
        'p-kirana',
        'Brand Marketing Manager',
        true,
      ],
      [
        'u-rev-ratna',
        'Ratna Sari',
        'ratna.sari@bentala.test',
        'p-bentala',
        'Senior Financial Analyst',
        true,
      ],
    ] as const
  ).map(([id, name, email, partnerId, jobTitle, isActive]) => ({
    id,
    name,
    email,
    password: crypto.randomUUID(),
    role: 'reviewer',
    isOnboarded: true,
    fieldKeys: [],
    studentStatus: null,
    major: null,
    reviewerProfile: { partnerId, jobTitle, isActive },
  }));

// Reviewer per B2B case, sesuai mitra dan jabatan (reviewerRole) di data case.
const SEED_REVIEWER_ASSIGNMENTS: IMockReviewerAssignment[] = [
  { caseId: 'c-b2b-overselling', reviewerId: 'u-reviewer' },
  { caseId: 'c-b2b-overselling', reviewerId: 'u-rev-maya' },
  { caseId: 'c-b2b-keterlambatan-kirim', reviewerId: 'u-rev-hendra' },
  { caseId: 'c-b2b-checkout-mobile', reviewerId: 'u-rev-dimas' },
  { caseId: 'c-b2b-kampanye-peluncuran', reviewerId: 'u-rev-laras' },
  { caseId: 'c-b2b-arus-kas', reviewerId: 'u-rev-ratna' },
];

const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

// Enrollment akun demo mahasiswa: satu contoh untuk hampir setiap status (CONTEXT.md 4.9).
const createSeedEnrollments = (): IMockEnrollmentRecord[] => {
  const base = { userId: 'u-student', score: null, certificateId: null, issuedAt: null };
  return [
    {
      ...base,
      id: 'e-1',
      caseId: 'c-ai-optimasi-api',
      status: 'in_progress',
      deadlineAt: null,
      updatedAt: daysFromNow(0),
    },
    {
      ...base,
      id: 'e-2',
      caseId: 'c-b2b-overselling',
      status: 'revision_requested',
      deadlineAt: daysFromNow(3),
      updatedAt: daysFromNow(-1),
      submission: {
        values: {
          'design-doc': { fileName: 'design-doc-overselling.pdf', sizeBytes: 1_284_000 },
          'prototype-repo': 'https://github.com/rahma-aulia/flash-sale-stock',
          'tradeoff-memo': null,
        },
        note: 'Memo trade-off menyusul, saya fokus ke prototipe dulu.',
        isLinkPublic: true,
        isOwnWork: true,
        submittedAt: daysFromNow(-2),
        attempt: 1,
      },
      revision: {
        reason: 'Deliverable belum lengkap',
        note: 'Trade-off memo belum ada, padahal bagian ini bernilai 25%. Lengkapi memo, lalu kirim ulang. Design doc dan prototipe sudah bisa dibuka.',
        reviewerRole: 'Senior Backend Engineer',
        requestedAt: daysFromNow(-1),
      },
      events: [
        { type: 'paid', at: daysFromNow(-9) },
        { type: 'started', at: daysFromNow(-7) },
        { type: 'submitted', at: daysFromNow(-2), attempt: 1 },
        { type: 'revision_requested', at: daysFromNow(-1) },
      ],
    },
    {
      ...base,
      id: 'e-3',
      caseId: 'c-b2b-keterlambatan-kirim',
      status: 'in_review',
      deadlineAt: null,
      updatedAt: daysFromNow(-2),
      submission: {
        values: {
          notebook: 'https://github.com/rahma-aulia/analisis-keterlambatan',
          dashboard: { fileName: 'dashboard-keterlambatan.pdf', sizeBytes: 2_410_000 },
          deck: { fileName: 'rekomendasi-rute.pdf', sizeBytes: 3_050_000 },
        },
        note: '',
        isLinkPublic: true,
        isOwnWork: true,
        submittedAt: daysFromNow(-2),
        attempt: 1,
      },
      events: [
        { type: 'paid', at: daysFromNow(-8) },
        { type: 'started', at: daysFromNow(-6) },
        { type: 'submitted', at: daysFromNow(-2), attempt: 1 },
      ],
    },
    {
      ...base,
      id: 'e-8',
      caseId: 'c-b2b-kampanye-peluncuran',
      status: 'not_started',
      deadlineAt: null,
      updatedAt: daysFromNow(-3),
      events: [{ type: 'paid', at: daysFromNow(-3) }],
    },
    {
      ...base,
      id: 'e-4',
      caseId: 'c-b2b-checkout-mobile',
      status: 'pending_payment',
      deadlineAt: daysFromNow(1),
      updatedAt: daysFromNow(0),
    },
    {
      ...base,
      id: 'e-5',
      caseId: 'c-ai-dashboard-retensi',
      status: 'passed',
      deadlineAt: null,
      updatedAt: daysFromNow(-12),
      score: 88,
      certificateId: 'CERT-AI-2026-0412',
      issuedAt: daysFromNow(-12),
    },
    {
      ...base,
      id: 'e-6',
      caseId: 'c-b2b-arus-kas',
      status: 'passed',
      deadlineAt: null,
      updatedAt: daysFromNow(-20),
      score: 91,
      certificateId: 'CERT-B2B-2026-0187',
      issuedAt: daysFromNow(-20),
    },
    {
      ...base,
      id: 'e-7',
      caseId: 'c-ai-prioritas-fitur',
      status: 'failed',
      deadlineAt: null,
      updatedAt: daysFromNow(-6),
      score: 54,
    },
  ];
};

// PLACEHOLDER: submission peserta lain untuk antrean portal reviewer. Pemiliknya bukan akun
// demo, jadi tidak muncul di dashboard mahasiswa; reviewer hanya melihatnya sebagai kandidat anonim.
// PLACEHOLDER: percobaan AI case milik member lain, untuk statistik penilaian AI di panel admin.
const createSeedMemberAiEnrollments = (): IMockEnrollmentRecord[] => {
  const base = { deadlineAt: null, certificateId: null, issuedAt: null };
  return [
    {
      ...base,
      id: 'e-m1',
      userId: 'u-member-5',
      caseId: 'c-ai-onboarding-app',
      status: 'passed',
      updatedAt: daysFromNow(-3),
      score: 79,
      certificateId: 'CERT-AI-2026-0455',
      issuedAt: daysFromNow(-3),
      events: [
        { type: 'started', at: daysFromNow(-3) },
        { type: 'submitted', at: daysFromNow(-3), attempt: 1 },
        { type: 'reviewed', at: daysFromNow(-3) },
      ],
    },
    {
      ...base,
      id: 'e-m2',
      userId: 'u-member-6',
      caseId: 'c-ai-konten-sosmed',
      status: 'failed',
      updatedAt: daysFromNow(-2),
      score: 48,
      events: [
        { type: 'started', at: daysFromNow(-2) },
        { type: 'submitted', at: daysFromNow(-2), attempt: 1 },
        { type: 'reviewed', at: daysFromNow(-2) },
      ],
    },
    {
      ...base,
      id: 'e-m3',
      userId: 'u-member-6',
      caseId: 'c-ai-konten-sosmed',
      status: 'in_progress',
      updatedAt: daysFromNow(0),
      score: null,
      events: [{ type: 'retried', at: daysFromNow(0) }],
    },
    {
      ...base,
      id: 'e-m4',
      userId: 'u-candidate-3',
      caseId: 'c-ai-dashboard-retensi',
      status: 'passed',
      updatedAt: daysFromNow(-25),
      score: 84,
      certificateId: 'CERT-AI-2026-0371',
      issuedAt: daysFromNow(-25),
    },
  ];
};

const createSeedCandidateEnrollments = (): IMockEnrollmentRecord[] => {
  const base = { score: null, certificateId: null, issuedAt: null, deadlineAt: null };
  const declaration = { isLinkPublic: true, isOwnWork: true };
  return [
    {
      ...base,
      id: 'e-c1',
      userId: 'u-candidate-1',
      caseId: 'c-b2b-overselling',
      status: 'in_review',
      updatedAt: daysFromNow(-4),
      submission: {
        ...declaration,
        values: {
          'design-doc': { fileName: 'rancangan-stok-flash-sale.pdf', sizeBytes: 1_870_000 },
          'prototype-repo': 'https://github.com/kandidat-1093/stock-reservation',
          'tradeoff-memo': { fileName: 'memo-tradeoff.pdf', sizeBytes: 412_000 },
        },
        note: 'Prototipe memakai Redis untuk reservasi stok. Cara menjalankan ada di README.',
        submittedAt: daysFromNow(-4),
        attempt: 1,
      },
      events: [
        { type: 'paid', at: daysFromNow(-12) },
        { type: 'started', at: daysFromNow(-10) },
        { type: 'submitted', at: daysFromNow(-4), attempt: 1 },
      ],
    },
    {
      ...base,
      id: 'e-c2',
      userId: 'u-candidate-2',
      caseId: 'c-b2b-arus-kas',
      status: 'in_review',
      updatedAt: daysFromNow(-1),
      submission: {
        ...declaration,
        values: {
          model: { fileName: 'proyeksi-kas-6-cabang.xlsx', sizeBytes: 684_000 },
          scenario: { fileName: 'analisis-skenario.pdf', sizeBytes: 905_000 },
          memo: { fileName: 'memo-rekomendasi-v2.pdf', sizeBytes: 238_000 },
        },
        note: 'Sumber asumsi biaya sewa sudah saya tambahkan di tab Asumsi sesuai catatan revisi.',
        submittedAt: daysFromNow(-1),
        attempt: 2,
      },
      revision: {
        reason: 'Deliverable belum sesuai brief',
        note: 'Asumsi kenaikan biaya sewa dan gaji belum disertai sumber. Tambahkan sumbernya di tab asumsi, lalu kirim ulang.',
        reviewerRole: 'Senior Financial Analyst',
        requestedAt: daysFromNow(-4),
      },
      events: [
        { type: 'paid', at: daysFromNow(-14) },
        { type: 'started', at: daysFromNow(-13) },
        { type: 'submitted', at: daysFromNow(-6), attempt: 1 },
        { type: 'revision_requested', at: daysFromNow(-4) },
        { type: 'submitted', at: daysFromNow(-1), attempt: 2 },
      ],
    },
    {
      ...base,
      id: 'e-c3',
      userId: 'u-candidate-3',
      caseId: 'c-b2b-keterlambatan-kirim',
      status: 'in_review',
      updatedAt: daysFromNow(-8),
      submission: {
        ...declaration,
        values: {
          notebook: 'https://github.com/kandidat-2210/delay-analysis',
          dashboard: { fileName: 'dashboard-pengiriman.pdf', sizeBytes: 1_520_000 },
          deck: { fileName: 'deck-rute-baru.pdf', sizeBytes: 2_960_000 },
        },
        note: '',
        submittedAt: daysFromNow(-8),
        attempt: 1,
      },
      events: [
        { type: 'paid', at: daysFromNow(-16) },
        { type: 'started', at: daysFromNow(-15) },
        { type: 'submitted', at: daysFromNow(-8), attempt: 1 },
      ],
    },
    {
      ...base,
      id: 'e-c4',
      userId: 'u-candidate-4',
      caseId: 'c-b2b-overselling',
      status: 'failed',
      updatedAt: daysFromNow(-5),
      score: 62,
      submission: {
        ...declaration,
        values: {
          'design-doc': { fileName: 'design-doc.pdf', sizeBytes: 980_000 },
          'prototype-repo': 'https://github.com/kandidat-3318/flash-sale',
          'tradeoff-memo': { fileName: 'tradeoff.pdf', sizeBytes: 301_000 },
        },
        note: '',
        submittedAt: daysFromNow(-9),
        attempt: 1,
      },
      events: [
        { type: 'submitted', at: daysFromNow(-9), attempt: 1 },
        { type: 'reviewed', at: daysFromNow(-5) },
      ],
    },
  ];
};

// PLACEHOLDER: order berhasil untuk setiap B2B case yang sudah dibayar, agar pendapatan di panel
// admin cocok dengan enrollment. Waktu bayar sama dengan event "paid"; nomor invoice ilustrasi.
const createSeedPaidOrders = (enrollments: IMockEnrollmentRecord[]): IMockOrderRecord[] =>
  enrollments.flatMap((record, index) => {
    const paidAt = record.events?.find((event) => event.type === 'paid')?.at;
    const price = findCaseById(record.caseId)?.price;
    if (!paidAt || !price) return [];
    const adminFee = 4000;
    return {
      id: `o-paid-${record.id}`,
      userId: record.userId,
      invoiceNumber: `INV/2026/10/${String(301 + index * 17).padStart(4, '0')}`,
      caseId: record.caseId,
      method: index % 2 === 0 ? 'va_bca' : 'qris',
      status: 'paid',
      subtotal: price,
      adminFee,
      total: price + adminFee,
      createdAt: paidAt,
      expiresAt: paidAt,
      vaNumber: null,
      paidAt,
    } satisfies IMockOrderRecord;
  });

// PLACEHOLDER: berapa hari lalu setiap akun mendaftar, agar menu Member punya urutan bergabung.
const JOINED_DAYS_AGO: Record<string, number> = {
  'u-student': 46,
  'u-candidate-1': 38,
  'u-candidate-2': 33,
  'u-candidate-3': 52,
  'u-candidate-4': 27,
  'u-member-5': 9,
  'u-member-6': 4,
  'u-member-7': 41,
  'u-member-8': 30,
  'u-member-9': 24,
};

// PLACEHOLDER: B2B case lulus yang direkomendasikan reviewer, untuk menu Talent pool. Hasil
// penilaian ditulis lengkap (bukan dari data contoh per case) karena skornya berbeda per peserta.
function createSeedTalentEnrollments(): IMockEnrollmentRecord[] {
  const feedback = {
    strengths: ['Keputusan utama didukung data dari materi case.'],
    improvements: ['Ringkasan eksekutif di awal dokumen akan memudahkan pembaca.'],
    nextSteps: ['Coba B2B case lain di bidang yang sama dengan tingkat kesulitan lebih tinggi.'],
  };
  const seeds = [
    {
      id: 'e-tp1',
      userId: 'u-member-7',
      caseId: 'c-b2b-overselling',
      reviewerId: 'u-rev-maya',
      reviewerRole: 'Senior Backend Engineer',
      certificateId: 'CERT-B2B-2026-0211',
      daysAgo: 6,
      consent: 'granted' as const,
      criteria: [
        ['Fungsional', 25, 5, 'Reservasi stok atomik terbukti mencegah stok minus di uji beban.'],
        [
          'Desain sistem',
          30,
          4,
          'Cocok dengan arsitektur mitra; fallback saat Redis gagal perlu diperjelas.',
        ],
        ['Analisis trade-off', 25, 4, 'Membandingkan lock pesimis dan antrean dengan jujur.'],
        ['Kualitas kode', 20, 4, 'Struktur rapi dan README lengkap; sebagian fungsi bisa dipecah.'],
      ] as const,
    },
    {
      id: 'e-tp2',
      userId: 'u-member-8',
      caseId: 'c-b2b-checkout-mobile',
      reviewerId: 'u-rev-dimas',
      reviewerRole: 'Product Design Lead',
      certificateId: 'CERT-B2B-2026-0224',
      daysAgo: 3,
      consent: 'pending' as const,
      criteria: [
        ['Kualitas riset', 25, 4, 'Hipotesis drop-off berangkat dari data funnel yang diberikan.'],
        [
          'Kualitas desain',
          35,
          5,
          'Alur checkout jauh lebih ringkas dan konsisten di layar kecil.',
        ],
        [
          'Dampak ke tujuan bisnis',
          25,
          4,
          'Menjawab penyebab utama drop-off di langkah pengiriman.',
        ],
        ['Rencana pengujian', 15, 4, 'Skenario uji dan metrik siap dijalankan.'],
      ] as const,
    },
    {
      id: 'e-tp3',
      userId: 'u-member-9',
      caseId: 'c-b2b-kampanye-peluncuran',
      reviewerId: 'u-rev-laras',
      reviewerRole: 'Brand Marketing Manager',
      certificateId: 'CERT-B2B-2026-0230',
      daysAgo: 9,
      consent: 'declined' as const,
      criteria: [
        ['Ketajaman insight audiens', 30, 4, 'Segmen dan motivasinya jelas, didukung data survei.'],
        ['Kualitas strategi', 35, 4, 'Pesan dan kanal saling mendukung; timeline realistis.'],
        ['Realisme anggaran', 15, 4, 'Alokasi masuk akal untuk enam minggu.'],
        ['Kreativitas materi', 20, 5, 'Contoh konten kuat dan sesuai kanal.'],
      ] as const,
    },
  ];

  return seeds.map((seed) => {
    const reviewedAt = daysFromNow(-seed.daysAgo);
    const criteria = seed.criteria.map(([name, weight, level, reason]) => ({
      name,
      weight,
      level,
      reason,
    }));
    const totalScore = Math.round(
      criteria.reduce((total, item) => total + (item.level / 5) * item.weight, 0)
    );
    return {
      id: seed.id,
      userId: seed.userId,
      caseId: seed.caseId,
      status: 'passed',
      deadlineAt: null,
      updatedAt: reviewedAt,
      score: totalScore,
      certificateId: seed.certificateId,
      issuedAt: reviewedAt,
      assignedReviewerId: seed.reviewerId,
      shareConsent: seed.consent,
      review: {
        totalScore,
        passingScore: 70,
        isPassed: true,
        criteria,
        feedback,
        reviewerRole: seed.reviewerRole,
        reviewedAt,
        isRecommended: true,
      },
      events: [
        { type: 'paid', at: daysFromNow(-seed.daysAgo - 12) },
        { type: 'started', at: daysFromNow(-seed.daysAgo - 10) },
        { type: 'submitted', at: daysFromNow(-seed.daysAgo - 3), attempt: 1 },
        { type: 'reviewed', at: reviewedAt },
      ],
    } satisfies IMockEnrollmentRecord;
  });
}

// PLACEHOLDER: order yang gagal dan kedaluwarsa, agar menu Order menampilkan semua status.
// Enrollment pending_payment-nya sudah dihapus, sama seperti alur checkout (CONTEXT.md 4.6).
const createSeedClosedOrders = (): IMockOrderRecord[] => [
  {
    id: 'o-expired-1',
    userId: 'u-member-6',
    invoiceNumber: 'INV/2026/10/0398',
    caseId: 'c-b2b-kampanye-peluncuran',
    method: 'va_mandiri',
    status: 'expired',
    subtotal: 129000,
    adminFee: 4000,
    total: 133000,
    createdAt: daysFromNow(-6),
    expiresAt: daysFromNow(-5),
    vaNumber: '8908 1206 5531 0398',
    paidAt: null,
  },
  {
    id: 'o-failed-1',
    userId: 'u-candidate-4',
    invoiceNumber: 'INV/2026/10/0405',
    caseId: 'c-b2b-arus-kas',
    method: 'gopay',
    status: 'failed',
    subtotal: 139000,
    adminFee: 0,
    total: 139000,
    createdAt: daysFromNow(-3),
    expiresAt: daysFromNow(-3),
    vaNumber: null,
    paidAt: null,
  },
];

// Order VA yang masih menunggu pembayaran, pasangan enrollment e-4 (CONTEXT.md 4.6).
const createSeedOrders = (): IMockOrderRecord[] => [
  {
    id: 'o-1',
    userId: 'u-student',
    invoiceNumber: 'INV/2026/10/0412',
    caseId: 'c-b2b-checkout-mobile',
    method: 'va_bca',
    status: 'awaiting_payment',
    subtotal: 129000,
    adminFee: 4000,
    total: 133000,
    createdAt: daysFromNow(0),
    expiresAt: daysFromNow(1),
    vaNumber: '8277 0812 4471 0412',
    paidAt: null,
  },
];

function createInitialState(): IMockState {
  const enrollments = [
    ...createSeedEnrollments(),
    ...createSeedCandidateEnrollments(),
    ...createSeedMemberAiEnrollments(),
    ...createSeedTalentEnrollments(),
  ];
  return {
    users: [...structuredClone(SEED_USERS), ...createSeedMembers(), ...createSeedReviewers()].map(
      (user) => ({ ...user, createdAt: daysFromNow(-(JOINED_DAYS_AGO[user.id] ?? 60)) })
    ),
    enrollments,
    orders: [
      ...createSeedOrders(),
      ...createSeedClosedOrders(),
      ...createSeedPaidOrders(enrollments),
    ],
    adminCases: [],
    partners: structuredClone(SEED_PARTNERS),
    reviewerAssignments: structuredClone(SEED_REVIEWER_ASSIGNMENTS),
    fields: FIELD_OPTIONS.map(({ key, label, description }, order) => ({
      key,
      label,
      description,
      isActive: true,
      order,
    })),
    settings: { ...DEFAULT_PLATFORM_SETTINGS },
    settingsLog: [],
    sessionUserId: null,
  };
}

function load(): IMockState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as IMockState;
  } catch {
    // Storage tidak tersedia (mode privat, dll.): pakai state awal.
  }
  return createInitialState();
}

let state: IMockState | null = null;

function getState() {
  state ??= load();
  return state;
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getState()));
  } catch {
    // Abaikan: data tetap ada di memori selama tab terbuka.
  }
}

export const toPublicUser = ({
  password: _password,
  profile: _profile,
  reviewerProfile: _reviewerProfile,
  createdAt: _createdAt,
  ...user
}: IMockUserRecord): IUser => user;

export const mockDb = {
  findUserByEmail: (email: string) =>
    getState().users.find((user) => user.email.toLowerCase() === email.toLowerCase()),

  findUserById: (id: string) => getState().users.find((user) => user.id === id),

  listAdminCases: () => getState().adminCases,

  /** Simpan case admin: menimpa versi lama dengan id yang sama. */
  saveAdminCase: (adminCase: IAdminCase) => {
    const { adminCases } = getState();
    const index = adminCases.findIndex((item) => item.id === adminCase.id);
    if (index === -1) adminCases.push(adminCase);
    else adminCases[index] = adminCase;
    save();
    return adminCase;
  },

  /** Portal reviewer: submission dari semua peserta (identitas disamarkan di reviewerApi). */
  listAllEnrollments: () => getState().enrollments,

  findEnrollmentById: (id: string) => getState().enrollments.find((item) => item.id === id),

  /** Verifikasi publik: cari di semua pengguna, tanpa perlu sesi. */
  findEnrollmentByCertificateId: (certificateId: string) =>
    getState().enrollments.find(
      (item) => item.certificateId?.toLowerCase() === certificateId.toLowerCase()
    ),

  createUser: (data: Pick<IMockUserRecord, 'name' | 'email' | 'password'>) => {
    const user: IMockUserRecord = {
      ...data,
      id: `u-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
      role: 'student',
      isOnboarded: false,
      fieldKeys: [],
      studentStatus: null,
      major: null,
    };
    getState().users.push(user);
    save();
    return user;
  },

  updateUser: (id: string, patch: Partial<IUser>) => {
    const user = mockDb.findUserById(id);
    if (!user) return undefined;
    Object.assign(user, patch);
    save();
    return user;
  },

  updateUserProfile: (id: string, patch: IMockProfileSettings) => {
    const user = mockDb.findUserById(id);
    if (!user) return undefined;
    user.profile = { ...user.profile, ...patch };
    save();
    return user;
  },

  getSessionUser: () => {
    const { sessionUserId } = getState();
    return sessionUserId ? mockDb.findUserById(sessionUserId) : undefined;
  },

  listEnrollments: (userId: string) =>
    getState().enrollments.filter((enrollment) => enrollment.userId === userId),

  addEnrollment: (data: Pick<IMockEnrollmentRecord, 'userId' | 'caseId' | 'status'>) => {
    const enrollment: IMockEnrollmentRecord = {
      ...data,
      id: `e-${crypto.randomUUID()}`,
      deadlineAt: null,
      updatedAt: new Date().toISOString(),
      score: null,
      certificateId: null,
      issuedAt: null,
    };
    getState().enrollments.push(enrollment);
    save();
    return enrollment;
  },

  /** isTouch false: catatan admin (tanda, pengingat) tidak mengubah waktu aktivitas peserta. */
  updateEnrollment: (
    id: string,
    patch: Partial<IMockEnrollmentRecord>,
    { isTouch = true }: { isTouch?: boolean } = {}
  ) => {
    const enrollment = getState().enrollments.find((item) => item.id === id);
    if (!enrollment) return undefined;
    Object.assign(enrollment, patch, isTouch ? { updatedAt: new Date().toISOString() } : {});
    save();
    return enrollment;
  },

  /** Catat peristiwa untuk timeline halaman status. */
  addEnrollmentEvent: (id: string, event: Omit<IStatusEvent, 'at'>) => {
    const enrollment = getState().enrollments.find((item) => item.id === id);
    if (!enrollment) return;
    enrollment.events = [...(enrollment.events ?? []), { ...event, at: new Date().toISOString() }];
    save();
  },

  removeEnrollment: (id: string) => {
    const state = getState();
    state.enrollments = state.enrollments.filter((item) => item.id !== id);
    save();
  },

  listOrders: (userId: string) => getState().orders.filter((order) => order.userId === userId),

  /** Panel admin: semua pengguna dan order. */
  listAllUsers: () => getState().users,

  listPartners: () => getState().partners,

  /** Simpan mitra: menimpa versi lama dengan id yang sama. */
  savePartner: (partner: IPartner) => {
    const { partners } = getState();
    const index = partners.findIndex((item) => item.id === partner.id);
    if (index === -1) partners.push(partner);
    else partners[index] = partner;
    save();
    return partner;
  },

  createReviewer: ({
    partnerId,
    jobTitle,
    isActive,
    ...identity
  }: Pick<IMockUserRecord, 'name' | 'email'> & IMockReviewerProfile) => {
    const user: IMockUserRecord = {
      ...identity,
      id: `u-rev-${crypto.randomUUID().slice(0, 8)}`,
      // Di produksi reviewer mengatur password sendiri lewat email undangan.
      password: crypto.randomUUID(),
      role: 'reviewer',
      isOnboarded: true,
      fieldKeys: [],
      studentStatus: null,
      major: null,
      reviewerProfile: { partnerId, jobTitle, isActive },
    };
    getState().users.push(user);
    save();
    return user;
  },

  updateReviewerProfile: (id: string, patch: Partial<IMockReviewerProfile>) => {
    const user = mockDb.findUserById(id);
    if (!user?.reviewerProfile) return undefined;
    user.reviewerProfile = { ...user.reviewerProfile, ...patch };
    save();
    return user;
  },

  listReviewerAssignments: () => getState().reviewerAssignments,

  listFields: () => [...getState().fields].sort((a, b) => a.order - b.order),

  /** Simpan seluruh daftar bidang (dipakai tambah, ubah, aktifkan, dan urutkan). */
  saveFields: (fields: IMockField[]) => {
    getState().fields = fields;
    save();
  },

  getSettings: () => getState().settings,

  /** Simpan nilai baru beserta catatan perubahannya. */
  saveSettings: (settings: IPlatformSettings, entry: ISettingsLogEntry) => {
    const state = getState();
    state.settings = settings;
    state.settingsLog = [entry, ...state.settingsLog];
    save();
  },

  listSettingsLog: () => getState().settingsLog,

  /** Ganti seluruh daftar reviewer untuk satu case (dari pembuat case). */
  setCaseReviewers: (caseId: string, reviewerIds: string[]) => {
    const state = getState();
    state.reviewerAssignments = [
      ...state.reviewerAssignments.filter((item) => item.caseId !== caseId),
      ...reviewerIds.map((reviewerId) => ({ caseId, reviewerId })),
    ];
    save();
  },

  /** Ganti seluruh daftar case untuk satu reviewer. */
  setReviewerCases: (reviewerId: string, caseIds: string[]) => {
    const state = getState();
    state.reviewerAssignments = [
      ...state.reviewerAssignments.filter((item) => item.reviewerId !== reviewerId),
      ...caseIds.map((caseId) => ({ caseId, reviewerId })),
    ];
    save();
  },

  listAllOrders: () => getState().orders,

  addOrder: (order: IMockOrderRecord) => {
    getState().orders.push(order);
    save();
    return order;
  },

  updateOrder: (id: string, patch: Partial<IOrder>) => {
    const order = getState().orders.find((item) => item.id === id);
    if (!order) return undefined;
    Object.assign(order, patch);
    save();
    return order;
  },

  setSession: (userId: string | null) => {
    getState().sessionUserId = userId;
    save();
  },

  /**
   * Mode campuran: auth memakai backend, layanan lain masih tiruan. Simpan salinan pengguna dari
   * backend (tanpa password) dan jadikan sesi tiruan, agar data tiruan lain mengenali pengguna.
   */
  syncRealUser: (user: IUser) => {
    const state = getState();
    const existing = state.users.find((item) => item.id === user.id);
    if (existing) Object.assign(existing, user);
    else state.users.push({ ...user, password: '' });
    state.sessionUserId = user.id;
    save();
  },

  reset: () => {
    state = createInitialState();
    save();
  },
};
