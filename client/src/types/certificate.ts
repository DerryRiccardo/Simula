import type { ICasePartner, ICertificate } from './case';

// Kontrak data halaman verifikasi sertifikat publik (prototype/CONTEXT.md 4.8, peta halaman bagian 5).

export interface ICertificateVerification {
  certificate: ICertificate;
  caseSlug: string;
  /** Skill yang dilatih case ini, ditampilkan sebagai kompetensi yang tervalidasi. */
  skills: string[];
  /** Contoh: "Senior Financial Analyst", atau "Penilai AI" untuk AI case. */
  reviewerRole: string;
  /** B2B: perusahaan mitra penerbit sertifikat. AI: null (diterbitkan platform). */
  partner: ICasePartner | null;
  passingScore: number;
  /** true bila sertifikat milik pengguna yang sedang masuk; aksi bagikan hanya untuk pemilik. */
  isOwner: boolean;
}
