import { calculateTotalScore } from '@/lib/score';
import type { ICaseBrief, ICriterionScore, IReviewFeedback, IReviewResult } from '@/types';

// PLACEHOLDER: hasil penilaian contoh untuk akun demo. Di produksi diisi reviewer atau AI.

export const AI_REVIEWER_ROLE = 'Penilai AI';

interface ISeedReview {
  levels: number[];
  reasons: string[];
  feedback: IReviewFeedback;
  isRecommended: boolean;
}

/** Kunci = id case. Level urut sesuai rubrik di caseBriefs. */
const SEED_REVIEWS: Record<string, ISeedReview> = {
  // B2B, lulus 91, direkomendasikan reviewer.
  'c-b2b-arus-kas': {
    levels: [5, 4, 5, 4],
    reasons: [
      'Rumus konsisten di kelima cabang dan setiap angka bisa ditelusuri ke data sumber. Tab asumsi dipisah dengan rapi.',
      'Sebagian besar asumsi berdasar tren dua tahun terakhir. Asumsi kenaikan biaya sewa 8% belum disertai sumber.',
      'Tiga skenario dibandingkan dengan jelas, termasuk titik kas terendah dan bulan kapan itu terjadi.',
      'Memo tegas merekomendasikan menunda pembukaan cabang ke-6. Bagian risiko bisa lebih ringkas.',
    ],
    feedback: {
      strengths: [
        'Model mudah diaudit: input, perhitungan, dan output dipisah per tab.',
        'Skenario pesimis menunjukkan kapan kas negatif, sehingga keputusan menjadi konkret.',
      ],
      improvements: [
        'Cantumkan sumber untuk asumsi biaya sewa dan gaji.',
        'Memo masih dua halaman penuh. Ringkasan satu paragraf di awal akan membantu pemilik bisnis.',
      ],
      nextSteps: [
        'Pelajari analisis sensitivitas untuk melihat asumsi mana yang paling memengaruhi kas.',
        'Coba case B2B lain di bidang keuangan untuk mengasah penulisan memo keputusan.',
      ],
    },
    isRecommended: true,
  },
  // AI, lulus 88.
  'c-ai-dashboard-retensi': {
    levels: [5, 3, 5],
    reasons: [
      'Retensi per kelompok bulan dihitung dengan benar, termasuk penanganan pelanggan yang berhenti lalu kembali.',
      'Dashboard lengkap tetapi padat. Tujuh grafik dalam satu halaman membuat temuan utama sulit ditemukan.',
      'Rekomendasi didukung angka dan langsung menyasar bulan kedua, saat retensi turun paling tajam.',
    ],
    feedback: {
      strengths: [
        'Perhitungan cohort akurat dan langkah pembersihan data terdokumentasi.',
        'Rekomendasi spesifik dan bisa langsung diuji tim bisnis.',
      ],
      improvements: [
        'Kurangi jumlah grafik. Pilih tiga yang paling menjawab pertanyaan bisnis.',
        'Beri judul grafik berupa kesimpulan, bukan nama metrik.',
      ],
      nextSteps: [
        'Latih visualisasi data untuk pembaca non-teknis.',
        'Siap divalidasi praktisi? Coba B2B case di bidang data.',
      ],
    },
    isRecommended: false,
  },
  // AI, belum lulus 54 (ambang 60).
  'c-ai-prioritas-fitur': {
    levels: [3, 3, 2],
    reasons: [
      'Masukan sudah dikelompokkan, tetapi beberapa kelompok tumpang tindih, misalnya "performa" dan "aplikasi lambat".',
      'Skor RICE dipakai, tetapi nilai effort tidak dijelaskan dari mana asalnya.',
      'Dokumen prioritas belum menyebut fitur mana yang ditunda dan alasannya untuk pemangku kepentingan.',
    ],
    feedback: {
      strengths: [
        'Memakai kerangka prioritas yang dikenal industri.',
        'Seluruh 312 masukan sudah dibaca dan diberi label.',
      ],
      improvements: [
        'Gabungkan kelompok yang tumpang tindih agar jumlah tema lebih sedikit dan tegas.',
        'Jelaskan dasar setiap angka effort, misalnya dari estimasi tim atau data sprint.',
        'Tulis bagian "yang tidak kita kerjakan" beserta alasannya.',
      ],
      nextSteps: [
        'Baca contoh dokumen prioritas produk dari perusahaan teknologi.',
        'Coba lagi case ini setelah memperbaiki logika prioritas.',
      ],
    },
    isRecommended: false,
  },
};

const toCriteria = (brief: ICaseBrief, levels: number[], reasons: string[]): ICriterionScore[] =>
  brief.rubric.map((criterion, index) => ({
    name: criterion.name,
    weight: criterion.weight,
    level: levels[index] ?? 3,
    reason: reasons[index] ?? '',
  }));

export function getSeedReview(
  caseId: string,
  brief: ICaseBrief,
  reviewerRole: string,
  reviewedAt: string
): IReviewResult | null {
  const seed = SEED_REVIEWS[caseId];
  if (!seed) return null;
  const criteria = toCriteria(brief, seed.levels, seed.reasons);
  const totalScore = calculateTotalScore(criteria);
  return {
    totalScore,
    passingScore: brief.passingScore,
    isPassed: totalScore >= brief.passingScore,
    criteria,
    feedback: seed.feedback,
    reviewerRole,
    reviewedAt,
    isRecommended: seed.isRecommended,
  };
}

// Alasan contoh per level untuk simulasi demo, mengikuti nama kriteria rubrik.
const DEMO_REASON: Record<number, (name: string) => string> = {
  5: (name) => `${name} sangat kuat dan konsisten di seluruh deliverable.`,
  4: (name) => `${name} sudah baik. Satu atau dua bagian bisa lebih tajam dengan contoh dari data.`,
  3: (name) => `${name} cukup, tetapi beberapa keputusan belum dijelaskan alasannya.`,
  2: (name) => `${name} belum memenuhi harapan. Bagian inti belum menjawab tugas di brief.`,
};

const DEMO_FEEDBACK: Record<'passed' | 'failed', IReviewFeedback> = {
  passed: {
    strengths: [
      'Struktur deliverable rapi dan mudah diikuti.',
      'Keputusan utama didukung data dari materi case.',
    ],
    improvements: ['Beberapa asumsi perlu sumber yang lebih jelas.'],
    nextSteps: ['Coba case lain di bidang yang sama dengan tingkat kesulitan lebih tinggi.'],
  },
  failed: {
    strengths: ['Semua deliverable dikirim lengkap dan tepat waktu.'],
    improvements: [
      'Hubungkan setiap rekomendasi dengan temuan dari data.',
      'Jelaskan alasan di balik pilihan metode yang dipakai.',
    ],
    nextSteps: ['Baca ulang rubrik, perbaiki kriteria dengan skor terendah, lalu kirim ulang.'],
  },
};

/** Prototype: hasil penilaian tiruan untuk tombol simulasi di halaman status. */
export function buildDemoReview(
  brief: ICaseBrief,
  outcome: 'passed' | 'failed',
  reviewerRole: string,
  isB2b: boolean
): IReviewResult {
  const pattern = outcome === 'passed' ? [5, 4, 4, 5] : [3, 2, 3, 2];
  const levels = brief.rubric.map((_, index) => pattern[index % pattern.length]);
  const criteria = toCriteria(
    brief,
    levels,
    brief.rubric.map((criterion, index) => DEMO_REASON[levels[index]](criterion.name))
  );
  const totalScore = calculateTotalScore(criteria);
  return {
    totalScore,
    passingScore: brief.passingScore,
    isPassed: totalScore >= brief.passingScore,
    criteria,
    feedback: DEMO_FEEDBACK[outcome],
    reviewerRole,
    reviewedAt: new Date().toISOString(),
    // Rekomendasi tetap keputusan reviewer; sistem hanya menyarankan bila skor ≥ 80.
    isRecommended: isB2b && totalScore >= 80,
  };
}
