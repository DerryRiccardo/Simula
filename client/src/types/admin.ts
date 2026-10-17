import type { TCaseLevel, TTier } from './case';
import type { TSlotKind } from './workspace';

// Kontrak data panel admin (prototype/CONTEXT.md 4.11). Semua case dan rubrik dibuat admin.

export type TAdminCaseStatus = 'draft' | 'published';

export interface IAdminCaseSummary {
  id: string;
  title: string;
  tier: TTier;
  fieldKey: string;
  level: TCaseLevel;
  status: TAdminCaseStatus;
  partnerName: string | null;
  participantCount: number;
  /** Submission B2B yang sedang menunggu review. */
  pendingReviewCount: number;
  updatedAt: string;
}

export interface IAdminSlotInput {
  title: string;
  description: string;
  kind: TSlotKind;
  isRequired: boolean;
  /** Ekstensi dipisah koma, mis. "pdf, docx". Hanya untuk slot berkas. */
  formats: string;
  maxSizeMb: number;
}

/** Isi pembuat case: satu objek untuk keenam bagian form. */
export interface IAdminCaseInput {
  tier: TTier;
  // 1. Info umum
  title: string;
  fieldKey: string;
  level: TCaseLevel;
  durationLabel: string;
  summary: string;
  // 2. Brief lengkap (paragraf konteks dipisah baris kosong)
  context: string;
  tasks: { title: string; description: string }[];
  // 3. Materi pendukung (prototype: hanya metadata, tanpa unggahan berkas)
  materials: { name: string; format: string; description: string }[];
  // 4. Slot deliverable
  slots: IAdminSlotInput[];
  // 5. Rubrik
  rubric: { name: string; weight: number; description: string }[];
  passingScore: number;
  // 6. Komersial (B2B saja)
  price: number;
  deadlineDays: number;
  partnerName: string;
  partnerIndustry: string;
  reviewerRole: string;
}

export interface IAdminCase extends IAdminCaseInput {
  id: string;
  status: TAdminCaseStatus;
  updatedAt: string;
}

export interface IAdminCaseSavePayload {
  input: IAdminCaseInput;
  /** true = terbitkan (validasi penuh), false = simpan sebagai draft. */
  isPublish: boolean;
}
