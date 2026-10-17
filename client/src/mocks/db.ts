import type {
  IAdminCase,
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

interface IMockUserRecord extends IUser {
  password: string;
  profile?: IMockProfileSettings;
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
  sessionUserId: string | null;
}

// Naikkan versi bila bentuk data berubah, agar data lama di localStorage diabaikan.
const STORAGE_KEY = 'ws-mock-db-v8';

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

const createInitialState = (): IMockState => ({
  users: structuredClone(SEED_USERS),
  enrollments: [...createSeedEnrollments(), ...createSeedCandidateEnrollments()],
  orders: createSeedOrders(),
  adminCases: [],
  sessionUserId: null,
});

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

  updateEnrollment: (id: string, patch: Partial<IMockEnrollmentRecord>) => {
    const enrollment = getState().enrollments.find((item) => item.id === id);
    if (!enrollment) return undefined;
    Object.assign(enrollment, patch, { updatedAt: new Date().toISOString() });
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
