import type { ICaseBrief, ICaseDetail, ISubmissionSlot } from '@/types';

// PLACEHOLDER: brief lengkap untuk prototype. Mitra fiktif, angka hanya ilustrasi.
// Brief B2B ditulis lengkap (fokus demo); AI case dibuat dari info umum di caseDetails.

const DOC_FORMATS = ['pdf', 'docx'];
const SHEET_FORMATS = ['xlsx', 'csv', 'pdf'];

const repoSlot = (id: string, title: string, description: string): ISubmissionSlot => ({
  id,
  title,
  description,
  kind: 'link',
  isRequired: true,
  linkHint: 'https://github.com/username/nama-repo',
});

const docSlot = (
  id: string,
  title: string,
  description: string,
  formats = DOC_FORMATS
): ISubmissionSlot => ({
  id,
  title,
  description,
  kind: 'file',
  isRequired: true,
  formats,
  maxSizeMb: 10,
});

const B2B_BRIEFS: Record<string, ICaseBrief> = {
  'c-b2b-overselling': {
    context: [
      'Sagara Commerce menjalankan flash sale setiap tanggal kembar. Pada kampanye terakhir, 5 sampai 8 persen pesanan berhasil dibayar padahal stok produk sudah habis. Tim customer service harus membatalkan pesanan satu per satu dan rating toko turun.',
      'Penyebabnya adalah race condition di layanan stok: beberapa permintaan checkout membaca sisa stok yang sama sebelum pengurangan stok tersimpan. Sistem berjalan di arsitektur microservice dengan layanan order, payment, dan inventory yang terpisah.',
      'Tim engineering tidak menentukan teknologi tertentu. Kamu bebas memilih pendekatan, selama alasannya jelas dan risikonya dipahami.',
    ],
    tasks: [
      {
        title: 'Rancang solusi',
        description:
          'Tulis design doc berisi alur checkout baru, diagram arsitektur, dan cara sistem menjaga stok tetap akurat saat ribuan permintaan datang bersamaan.',
      },
      {
        title: 'Bangun prototipe',
        description:
          'Implementasikan bagian inti solusimu dalam kode yang bisa dijalankan, lengkap dengan cara mensimulasikan checkout bersamaan.',
      },
      {
        title: 'Jelaskan trade-off',
        description:
          'Tulis memo singkat: alternatif yang kamu pertimbangkan, alasan memilih pendekatanmu, dan risiko yang masih ada.',
      },
    ],
    materials: [
      {
        id: 'm-arsitektur',
        name: 'Dokumentasi arsitektur layanan',
        format: 'PDF',
        sizeLabel: '1,8 MB',
        description: 'Diagram layanan order, payment, dan inventory beserta alur datanya.',
      },
      {
        id: 'm-traffic',
        name: 'Data traffic flash sale',
        format: 'CSV',
        sizeLabel: '4,2 MB',
        description: 'Jumlah permintaan per detik selama tiga kampanye terakhir.',
      },
      {
        id: 'm-template',
        name: 'Template design doc',
        format: 'DOCX',
        sizeLabel: '86 KB',
        description: 'Kerangka bagian yang diharapkan reviewer.',
      },
    ],
    rubric: [
      {
        name: 'Fungsional',
        weight: 25,
        description: 'Prototipe berjalan dan benar-benar mencegah stok minus saat diuji bersamaan.',
      },
      {
        name: 'Desain sistem',
        weight: 30,
        description:
          'Solusi cocok dengan arsitektur mitra dan tetap bekerja saat traffic memuncak.',
      },
      {
        name: 'Analisis trade-off',
        weight: 25,
        description: 'Alternatif dibandingkan dengan jujur, risiko dan batasan disebutkan.',
      },
      {
        name: 'Kualitas kode',
        weight: 20,
        description: 'Kode mudah dibaca, terstruktur, dan punya cara menjalankan yang jelas.',
      },
    ],
    slots: [
      docSlot('design-doc', 'Design doc', 'Rancangan solusi lengkap dengan diagram.'),
      repoSlot(
        'prototype-repo',
        'Repositori prototipe',
        'Repositori publik berisi kode dan README cara menjalankan.'
      ),
      docSlot('tradeoff-memo', 'Trade-off memo', 'Maksimal dua halaman.'),
    ],
    passingScore: 70,
    deadlineDays: 7,
  },
  'c-b2b-keterlambatan-kirim': {
    context: [
      'Samudra Logistik mencatat 18 persen paket antarkota tiba melewati estimasi dalam tiga bulan terakhir. Keluhan pelanggan naik, dan tim operasional belum tahu rute atau hub mana yang paling bermasalah.',
      'Kamu mendapat data historis pengiriman: asal, tujuan, hub transit, waktu tempuh, dan estimasi awal. Tugasmu mencari pola keterlambatan dan mengusulkan perbaikan yang bisa dijalankan tim operasional.',
    ],
    tasks: [
      {
        title: 'Eksplorasi data',
        description:
          'Bersihkan data dan temukan rute, hub, atau waktu yang paling sering terlambat.',
      },
      {
        title: 'Visualisasikan temuan',
        description:
          'Buat dashboard ringkas yang bisa dibaca manajer operasional dalam lima menit.',
      },
      {
        title: 'Usulkan perbaikan',
        description:
          'Susun rekomendasi beserta perkiraan dampaknya terhadap persentase keterlambatan.',
      },
    ],
    materials: [
      {
        id: 'm-shipments',
        name: 'Data pengiriman Juli sampai September',
        format: 'CSV',
        sizeLabel: '12,6 MB',
        description: '184 ribu baris pengiriman antarkota.',
      },
      {
        id: 'm-hubs',
        name: 'Daftar hub dan kapasitas',
        format: 'XLSX',
        sizeLabel: '240 KB',
        description: 'Lokasi hub, jam operasional, dan kapasitas harian.',
      },
    ],
    rubric: [
      {
        name: 'Kedalaman analisis',
        weight: 35,
        description: 'Pola ditemukan dari data, bukan asumsi.',
      },
      {
        name: 'Ketepatan metode',
        weight: 25,
        description: 'Metode analisis sesuai pertanyaan bisnis.',
      },
      {
        name: 'Kualitas rekomendasi',
        weight: 25,
        description: 'Usulan realistis dan terukur dampaknya.',
      },
      { name: 'Komunikasi temuan', weight: 15, description: 'Dashboard dan deck mudah dipahami.' },
    ],
    slots: [
      repoSlot(
        'notebook',
        'Notebook analisis',
        'Repositori atau notebook publik berisi proses analisis.'
      ),
      docSlot('dashboard', 'Dashboard ringkas', 'Ekspor dashboard dalam PDF.', ['pdf']),
      docSlot('deck', 'Deck rekomendasi', 'Maksimal 10 slide.', ['pdf', 'pptx']),
    ],
    passingScore: 70,
    deadlineDays: 7,
  },
  'c-b2b-checkout-mobile': {
    context: [
      'Di aplikasi Kirana Retail, 68 persen pembeli meninggalkan keranjang di tahap checkout. Data menunjukkan drop-off terbesar terjadi di langkah pengisian alamat dan pemilihan metode bayar.',
      'Tim produk ingin alur checkout yang lebih singkat tanpa mengorbankan rasa aman pembeli.',
    ],
    tasks: [
      {
        title: 'Pahami masalah',
        description: 'Pelajari data funnel dan masukan pengguna, lalu susun hipotesis.',
      },
      {
        title: 'Rancang ulang',
        description: 'Buat prototipe interaktif alur checkout baru di Figma.',
      },
      {
        title: 'Rencanakan pengujian',
        description: 'Susun skenario uji pengguna dan metrik keberhasilan.',
      },
    ],
    materials: [
      {
        id: 'm-funnel',
        name: 'Data funnel checkout',
        format: 'XLSX',
        sizeLabel: '310 KB',
        description: 'Konversi per langkah selama 30 hari.',
      },
      {
        id: 'm-feedback',
        name: 'Rangkuman masukan pengguna',
        format: 'PDF',
        sizeLabel: '920 KB',
        description: '120 kutipan ulasan aplikasi tentang checkout.',
      },
    ],
    rubric: [
      {
        name: 'Kualitas riset',
        weight: 25,
        description: 'Hipotesis berangkat dari data yang diberikan.',
      },
      {
        name: 'Kualitas desain',
        weight: 35,
        description: 'Alur jelas, konsisten, dan nyaman di layar kecil.',
      },
      {
        name: 'Dampak ke tujuan bisnis',
        weight: 25,
        description: 'Solusi menjawab penyebab drop-off.',
      },
      {
        name: 'Rencana pengujian',
        weight: 15,
        description: 'Skenario dan metrik bisa langsung dijalankan.',
      },
    ],
    slots: [
      {
        id: 'prototype-repo',
        title: 'Prototipe interaktif',
        description: 'Tautan Figma dengan akses lihat untuk siapa saja.',
        kind: 'link',
        isRequired: true,
        linkHint: 'https://www.figma.com/proto/...',
      },
      docSlot('research', 'Laporan riset', 'Temuan masalah dan hipotesis.', ['pdf']),
      docSlot('test-plan', 'Rencana uji pengguna', 'Skenario dan metrik keberhasilan.'),
    ],
    passingScore: 70,
    deadlineDays: 6,
  },
  'c-b2b-kampanye-peluncuran': {
    context: [
      'Kirana Retail akan meluncurkan lini produk kecantikan untuk pembeli usia 18 sampai 24 tahun. Anggaran kampanye peluncuran Rp 250 juta untuk enam minggu.',
      'Tim brand butuh strategi yang jelas: siapa yang disasar, pesan apa yang disampaikan, lewat kanal apa, dan bagaimana keberhasilannya diukur.',
    ],
    tasks: [
      {
        title: 'Kenali audiens',
        description: 'Tentukan segmen utama dan alasan mereka akan membeli.',
      },
      {
        title: 'Susun strategi',
        description: 'Tentukan pesan, kanal, timeline, dan alokasi anggaran.',
      },
      { title: 'Buat contoh materi', description: 'Siapkan contoh konten untuk dua kanal utama.' },
    ],
    materials: [
      {
        id: 'm-product',
        name: 'Profil produk dan harga',
        format: 'PDF',
        sizeLabel: '2,1 MB',
        description: 'Lini produk, harga, dan keunggulan utama.',
      },
      {
        id: 'm-market',
        name: 'Riset pasar singkat',
        format: 'PDF',
        sizeLabel: '1,4 MB',
        description: 'Kebiasaan belanja kosmetik pembeli muda.',
      },
    ],
    rubric: [
      {
        name: 'Ketajaman insight audiens',
        weight: 30,
        description: 'Segmen dan motivasinya jelas.',
      },
      {
        name: 'Kualitas strategi',
        weight: 35,
        description: 'Pesan, kanal, dan timeline saling mendukung.',
      },
      {
        name: 'Realisme anggaran',
        weight: 15,
        description: 'Alokasi masuk akal untuk enam minggu.',
      },
      {
        name: 'Kreativitas materi',
        weight: 20,
        description: 'Contoh konten sesuai audiens dan kanal.',
      },
    ],
    slots: [
      docSlot('strategy', 'Dokumen strategi', 'Strategi kampanye lengkap dengan timeline.'),
      docSlot('creative', 'Contoh materi kampanye', 'Gabungkan dalam satu PDF.', ['pdf']),
    ],
    passingScore: 70,
    deadlineDays: 6,
  },
  'c-b2b-arus-kas': {
    context: [
      'Bentala Finance mendampingi jaringan kafe yang ingin membuka cabang ke-6. Pemilik butuh gambaran arus kas 12 bulan sebelum memutuskan.',
      'Kamu mendapat laporan keuangan lima cabang yang sudah berjalan sebagai dasar asumsi.',
    ],
    tasks: [
      {
        title: 'Susun asumsi',
        description: 'Tentukan asumsi pendapatan, biaya, dan modal awal dari data historis.',
      },
      {
        title: 'Bangun model',
        description: 'Buat proyeksi arus kas bulanan dengan tiga skenario.',
      },
      { title: 'Beri rekomendasi', description: 'Tulis memo keputusan untuk pemilik bisnis.' },
    ],
    materials: [
      {
        id: 'm-financials',
        name: 'Laporan keuangan lima cabang',
        format: 'XLSX',
        sizeLabel: '880 KB',
        description: 'Pendapatan dan biaya bulanan dua tahun terakhir.',
      },
    ],
    rubric: [
      { name: 'Ketepatan model', weight: 35, description: 'Rumus konsisten dan mudah ditelusuri.' },
      { name: 'Kewajaran asumsi', weight: 25, description: 'Asumsi berdasar data, bukan tebakan.' },
      {
        name: 'Analisis skenario',
        weight: 20,
        description: 'Perbedaan skenario dijelaskan dampaknya.',
      },
      {
        name: 'Kualitas rekomendasi',
        weight: 20,
        description: 'Memo tegas dan bisa dipakai mengambil keputusan.',
      },
    ],
    slots: [
      docSlot('model', 'Model keuangan', 'Spreadsheet proyeksi arus kas.', SHEET_FORMATS),
      docSlot('scenario', 'Analisis skenario', 'Perbandingan tiga skenario.'),
      docSlot('memo', 'Memo rekomendasi', 'Maksimal dua halaman.'),
    ],
    passingScore: 70,
    deadlineDays: 5,
  },
};

const AI_PASSING_SCORE = 60;

// Brief AI case dibentuk dari info umum. Slot dibatasi ke format yang bisa dibaca AI (CONTEXT 4.5).
function buildAiBrief(detail: ICaseDetail): ICaseBrief {
  return {
    context: [
      detail.about,
      'Kerjakan dengan asumsi yang masuk akal dan tuliskan asumsimu. AI menilai berdasarkan rubrik di tab Rubrik.',
    ],
    tasks: detail.activities.map((activity) => ({
      title: activity,
      description: 'Catat temuan dan keputusanmu, karena penjelasan ikut dinilai.',
    })),
    materials: [
      {
        id: 'm-brief',
        name: 'Data dan konteks pendukung',
        format: 'ZIP',
        sizeLabel: '1,2 MB',
        description: 'Berkas yang dibutuhkan untuk mengerjakan case ini.',
      },
    ],
    rubric: detail.criteria.map((criterion) => ({
      ...criterion,
      description: 'Dinilai dari kelengkapan, ketepatan, dan kejelasan penjelasanmu.',
    })),
    slots: detail.deliverables.map((deliverable, index) => {
      const isRepo = /repositori/i.test(deliverable.title);
      return isRepo
        ? repoSlot(`slot-${index + 1}`, deliverable.title, deliverable.description)
        : docSlot(`slot-${index + 1}`, deliverable.title, deliverable.description, [
            'pdf',
            'docx',
            'xlsx',
          ]);
    }),
    passingScore: AI_PASSING_SCORE,
    deadlineDays: null,
  };
}

export const getCaseBrief = (detail: ICaseDetail): ICaseBrief =>
  B2B_BRIEFS[detail.id] ?? buildAiBrief(detail);
