// Aturan dan teks bersama untuk penilaian reviewer (prototype/CONTEXT.md 4.10 dan bagian 7).

/** SLA review reviewer mitra, dihitung dari submit terakhir. */
export const REVIEW_SLA_BUSINESS_DAYS = 5;

/** Saran sistem untuk rekomendasi interview; keputusan akhir tetap di reviewer. */
export const RECOMMENDATION_THRESHOLD = 80;

/**
 * Deskripsi umum level 1-5. PLACEHOLDER: di produksi admin menulis deskripsi level per kriteria
 * saat menyusun rubrik; prototype memakai kerangka umum yang sama untuk semua kriteria.
 */
export const RUBRIC_LEVELS = [
  { level: 1, label: 'Belum ada', description: 'Bagian ini tidak ada atau tidak menjawab tugas.' },
  {
    level: 2,
    label: 'Kurang',
    description: 'Ada, tetapi banyak kekeliruan atau belum menjawab inti tugas.',
  },
  {
    level: 3,
    label: 'Cukup',
    description: 'Menjawab tugas, dengan beberapa kekurangan yang jelas.',
  },
  { level: 4, label: 'Baik', description: 'Tepat dan rapi, hanya perlu sedikit penyempurnaan.' },
  {
    level: 5,
    label: 'Sangat baik',
    description: 'Melampaui harapan dan siap dipakai di lingkungan kerja.',
  },
] as const;

/** Alasan umum mengembalikan submission (belum dinilai, tidak mengurangi skor). */
export const REVISION_REASONS = [
  'Deliverable belum lengkap',
  'Tautan tidak bisa dibuka',
  'Berkas tidak bisa dibuka',
  'Deliverable belum sesuai brief',
] as const;

export type TQueueTab = 'pending' | 'history';
export type TQueueSort = 'due' | 'newest' | 'oldest' | 'decided' | 'score_high' | 'score_low';

/** Urutan berbeda per tab: antrean soal tenggat, riwayat soal keputusan dan skor. */
export const QUEUE_SORT_OPTIONS: Record<TQueueTab, { value: TQueueSort; label: string }[]> = {
  pending: [
    { value: 'due', label: 'Tenggat terdekat' },
    { value: 'newest', label: 'Dikirim terbaru' },
    { value: 'oldest', label: 'Dikirim terlama' },
  ],
  history: [
    { value: 'decided', label: 'Diputuskan terbaru' },
    { value: 'score_high', label: 'Skor tertinggi' },
    { value: 'score_low', label: 'Skor terendah' },
  ],
};
