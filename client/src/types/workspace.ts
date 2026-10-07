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

export interface IFileMeta {
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
  brief: ICaseBrief;
  /** null = pengguna belum mengambil case ini. */
  enrollment: IEnrollment | null;
  draft: ISubmissionDraft | null;
  submission: ISubmissionRecord | null;
  revision: IRevisionRequest | null;
}
