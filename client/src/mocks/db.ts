import type {
  IOrder,
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
  sessionUserId: string | null;
}

// Naikkan versi bila bentuk data berubah, agar data lama di localStorage diabaikan.
const STORAGE_KEY = 'ws-mock-db-v6';

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
  enrollments: createSeedEnrollments(),
  orders: createSeedOrders(),
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

  reset: () => {
    state = createInitialState();
    save();
  },
};
