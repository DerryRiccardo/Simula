import type { ICaseDetail, IEnrollment } from './case';

// Kontrak data halaman pengerjaan (prototype/CONTEXT.md 4.5 dan 4.7).

/** file = unggah berkas, link = tautan (repo/Drive/Figma), text = isian teks (AI case). */
export type TSlotKind = 'file' | 'link' | 'text';

export interface ISubmissionSlot {
  /**
   * Unik per case. Jangan pakai "prototype", "constructor", atau "__proto__": react-hook-form
   * mengabaikan nama field itu demi keamanan, sehingga isiannya hilang.
   */
  id: string;
  title: string;
  description: string;
  kind: TSlotKind;
  isRequired: boolean;
  /** Ekstensi yang diterima untuk slot berkas, tanpa titik. Contoh: ['pdf', 'docx']. */
  formats?: string[];
  maxSizeMb?: number;
  /** Contoh tautan yang diharapkan, ditampilkan sebagai placeholder. */
  linkHint?: string;
  /** Slot teks: panjang minimal saat submit. null/kosong = tanpa batas minimal. */
  minLength?: number | null;
  /** Slot teks: panjang maksimal. null/kosong = batas bawaan server. */
  maxLength?: number | null;
}

export interface ICaseTask {
  title: string;
  description: string;
}

export interface ICaseMaterial {
  id: string;
  name: string;
  format: string;
  sizeLabel: string;
  description: string;
}

export interface IRubricCriterion {
  name: string;
  /** Persen; total semua kriteria = 100. */
  weight: number;
  description: string;
}

/** Brief lengkap: hanya untuk peserta yang sudah mulai (AI) atau membayar (B2B). */
export interface ICaseBrief {
  context: string[];
  tasks: ICaseTask[];
  materials: ICaseMaterial[];
  rubric: IRubricCriterion[];
  slots: ISubmissionSlot[];
  passingScore: number;
  /** Lama pengerjaan sejak klik "Mulai mengerjakan". null = tanpa tenggat (AI case). */
  deadlineDays: number | null;
}

/** Berkas yang sudah diunggah. fileId dari POST /uploads; nama dan ukuran untuk tampilan. */
export interface IFileMeta {
  fileId: string;
  fileName: string;
  sizeBytes: number;
}

/** Nilai per slot: metadata berkas, URL, atau teks. Kosong = null atau string kosong. */
export type TSlotValue = IFileMeta | string | null;

export interface ISubmissionContent {
  values: Record<string, TSlotValue>;
  note: string;
  isLinkPublic: boolean;
  isOwnWork: boolean;
}

export interface ISubmissionDraft extends ISubmissionContent {
  savedAt: string;
}

export interface ISubmissionRecord extends ISubmissionContent {
  submittedAt: string;
  /** Percobaan ke-n; naik setiap submit ulang setelah revisi. */
  attempt: number;
}

export interface IRevisionRequest {
  reason: string;
  note: string;
  reviewerRole: string;
  requestedAt: string;
}

export interface ICaseWorkspace {
  caseInfo: ICaseDetail;
  /** null = belum mengambil case ini, atau B2B belum dibayar (brief masih terkunci). */
  brief: ICaseBrief | null;
  /** null = pengguna belum mengambil case ini. */
  enrollment: IEnrollment | null;
  draft: ISubmissionDraft | null;
  submission: ISubmissionRecord | null;
  revision: IRevisionRequest | null;
}

/** Workspace yang brief-nya sudah terbuka: case sudah dimulai (AI) atau dibayar (B2B). */
export interface IUnlockedWorkspace extends ICaseWorkspace {
  brief: ICaseBrief;
}

/** URL unggah langsung ke penyimpanan (POST /uploads). Browser mengirim PUT dengan headers. */
export interface IUploadTicket {
  fileId: string;
  fileName: string;
  sizeBytes: number;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresAt: string;
}
