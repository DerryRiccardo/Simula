import type { ICaseDetail, ICasePartner, ICaseSummary } from '@/types';

// PLACEHOLDER: konten info umum tiap case untuk halaman detail (sebelum mulai / bayar).
// Mitra fiktif; dua case pertama mengikuti contoh di prototype/CONTEXT.md bagian 3.

export type TCaseDetailContent = Omit<ICaseDetail, keyof ICaseSummary | 'myEnrollment'>;

const PARTNERS = {
  sagara: {
    name: 'Sagara Commerce',
    industry: 'E-commerce',
    about:
      'Marketplace dengan jutaan transaksi per bulan. Tim engineering-nya menangani lonjakan traffic besar setiap kampanye flash sale.',
  },
  samudra: {
    name: 'Samudra Logistik',
    industry: 'Logistik',
    about:
      'Penyedia jasa pengiriman antarkota dengan ratusan titik hub di Jawa, Sumatra, dan Sulawesi.',
  },
  kirana: {
    name: 'Kirana Retail',
    industry: 'Retail',
    about:
      'Jaringan retail gaya hidup dengan toko fisik dan aplikasi belanja yang terus mengembangkan kanal digitalnya.',
  },
  bentala: {
    name: 'Bentala Finance',
    industry: 'Jasa keuangan',
    about:
      'Perusahaan jasa keuangan yang mendampingi bisnis menengah dalam perencanaan modal dan ekspansi.',
  },
} satisfies Record<string, ICasePartner>;

const AI_BASE = { reviewerRole: null, partner: null } as const;

export const CASE_DETAILS: Record<string, TCaseDetailContent> = {
  'c-ai-optimasi-api': {
    ...AI_BASE,
    about:
      'Sebuah toko online mendapati halaman katalog produknya melambat drastis saat traffic naik. Kamu berperan sebagai back-end developer yang diminta mencari penyebabnya dan memperbaikinya tanpa mengganggu aplikasi yang sudah berjalan.',
    activities: [
      'Mempelajari kode dan struktur database yang sudah ada',
      'Mengukur performa dan menemukan akar masalah',
      'Melakukan refactor tanpa mengubah output API',
      'Menjelaskan perubahan dan hasilnya secara singkat',
    ],
    deliverables: [
      {
        title: 'Repositori kode',
        description: 'Tautan repositori GitHub publik berisi perbaikan.',
      },
      { title: 'README singkat', description: 'Penjelasan akar masalah, perubahan, dan hasilnya.' },
    ],
    skills: ['Query optimization', 'Indexing database', 'Profiling', 'REST API'],
    prerequisites: ['Dasar SQL', 'Pernah membuat REST API sederhana', 'Dasar Git'],
    criteria: [
      { name: 'Ketepatan analisis masalah', weight: 30 },
      { name: 'Efektivitas perbaikan', weight: 35 },
      { name: 'Kualitas kode', weight: 20 },
      { name: 'Kejelasan dokumentasi', weight: 15 },
    ],
  },
  'c-b2b-overselling': {
    about:
      'Saat flash sale, sebagian pesanan berhasil dibayar padahal stoknya sudah habis. Kamu diminta merancang solusi agar stok tetap akurat ketika ribuan pembeli checkout di detik yang sama, dengan pendekatan teknologi yang kamu tentukan sendiri.',
    activities: [
      'Memahami arsitektur dan pola traffic dari dokumentasi mitra',
      'Merancang solusi beserta diagram arsitekturnya',
      'Membangun prototipe kode yang berfungsi',
      'Menuliskan trade-off dari pilihan desainmu',
    ],
    deliverables: [
      { title: 'Design doc', description: 'Rancangan solusi lengkap dengan diagram.' },
      {
        title: 'Prototipe kode',
        description: 'Repositori berisi implementasi yang bisa dijalankan.',
      },
      { title: 'Trade-off memo', description: 'Alasan pilihan desain dan risikonya.' },
    ],
    skills: ['Concurrency', 'Desain sistem', 'Distributed locking', 'Penulisan teknis'],
    prerequisites: [
      'Memahami transaksi database',
      'Pernah membangun back-end service',
      'Dasar arsitektur microservice',
    ],
    criteria: [
      { name: 'Fungsional', weight: 25 },
      { name: 'Desain sistem', weight: 30 },
      { name: 'Analisis trade-off', weight: 25 },
      { name: 'Kualitas kode', weight: 20 },
    ],
    reviewerRole: 'Senior Backend Engineer',
    partner: PARTNERS.sagara,
  },
  'c-ai-dashboard-retensi': {
    ...AI_BASE,
    about:
      'Tim bisnis sebuah aplikasi langganan ingin tahu berapa banyak pelanggan yang bertahan dari bulan ke bulan. Kamu mengolah data transaksi menjadi dashboard retensi yang mudah dibaca orang non-teknis.',
    activities: [
      'Membersihkan dan menyiapkan data transaksi',
      'Menghitung retensi pelanggan per kelompok bulan',
      'Menyusun dashboard yang ringkas',
      'Menulis rekomendasi untuk tim bisnis',
    ],
    deliverables: [
      { title: 'Berkas analisis', description: 'Spreadsheet atau notebook berisi olahan data.' },
      { title: 'Ringkasan rekomendasi', description: 'Temuan utama dan saran dalam satu halaman.' },
    ],
    skills: ['Cohort analysis', 'Visualisasi data', 'Spreadsheet', 'Storytelling data'],
    prerequisites: ['Dasar spreadsheet atau Python', 'Memahami rata-rata dan persentase'],
    criteria: [
      { name: 'Ketepatan perhitungan', weight: 35 },
      { name: 'Kejelasan visualisasi', weight: 30 },
      { name: 'Kualitas rekomendasi', weight: 35 },
    ],
  },
  'c-b2b-keterlambatan-kirim': {
    about:
      'Sebagian paket antarkota tiba melewati estimasi dan keluhan pelanggan terus naik. Kamu menganalisis data historis pengiriman untuk menemukan polanya, lalu mengusulkan perbaikan yang realistis untuk tim operasional.',
    activities: [
      'Menjelajahi data historis pengiriman dari mitra',
      'Menemukan pola dan faktor penyebab keterlambatan',
      'Menyusun usulan perbaikan rute atau proses',
      'Mempresentasikan temuan untuk manajer operasional',
    ],
    deliverables: [
      {
        title: 'Notebook analisis',
        description: 'Proses dan hasil analisis data yang bisa diikuti.',
      },
      { title: 'Dashboard ringkas', description: 'Visualisasi temuan utama.' },
      { title: 'Deck rekomendasi', description: 'Usulan perbaikan beserta perkiraan dampaknya.' },
    ],
    skills: ['Exploratory data analysis', 'Python / SQL', 'Visualisasi data', 'Analisis bisnis'],
    prerequisites: ['Dasar Python atau SQL', 'Dasar statistik deskriptif'],
    criteria: [
      { name: 'Kedalaman analisis', weight: 35 },
      { name: 'Ketepatan metode', weight: 25 },
      { name: 'Kualitas rekomendasi', weight: 25 },
      { name: 'Komunikasi temuan', weight: 15 },
    ],
    reviewerRole: 'Lead Data Analyst',
    partner: PARTNERS.samudra,
  },
  'c-ai-onboarding-app': {
    ...AI_BASE,
    about:
      'Banyak pengguna baru sebuah aplikasi berhenti sebelum menyelesaikan pendaftaran. Kamu meninjau alur onboarding yang ada, menemukan titik masalahnya, lalu mengusulkan alur baru yang lebih jelas.',
    activities: [
      'Meninjau alur onboarding dan data drop-off',
      'Memetakan masalah utama dari sudut pandang pengguna',
      'Merancang alur dan wireframe baru',
      'Menjelaskan alasan setiap keputusan desain',
    ],
    deliverables: [
      { title: 'Wireframe alur baru', description: 'Tautan Figma atau berkas PDF.' },
      { title: 'Rasional desain', description: 'Penjelasan masalah dan solusi yang diusulkan.' },
    ],
    skills: ['User flow', 'Wireframing', 'Heuristic evaluation', 'UX writing'],
    prerequisites: ['Dasar Figma', 'Mengenal prinsip dasar UX'],
    criteria: [
      { name: 'Identifikasi masalah', weight: 30 },
      { name: 'Kualitas solusi', weight: 40 },
      { name: 'Kejelasan rasional', weight: 30 },
    ],
  },
  'c-b2b-checkout-mobile': {
    about:
      'Banyak pembeli meninggalkan keranjang di tahap checkout aplikasi mobile. Kamu diminta merancang ulang alur checkout agar lebih singkat dan meyakinkan, berdasarkan data perilaku pengguna dari mitra.',
    activities: [
      'Mempelajari data funnel checkout dan masukan pengguna',
      'Menyusun hipotesis penyebab cart abandonment',
      'Merancang prototipe checkout baru',
      'Menyusun rencana pengujian dengan pengguna',
    ],
    deliverables: [
      { title: 'Prototipe interaktif', description: 'Tautan prototipe Figma yang bisa diklik.' },
      { title: 'Laporan riset', description: 'Temuan masalah dan hipotesis.' },
      { title: 'Rencana uji pengguna', description: 'Skenario dan metrik keberhasilan.' },
    ],
    skills: ['Riset UX', 'Prototyping', 'Desain mobile', 'Usability testing'],
    prerequisites: ['Mahir Figma', 'Pernah membuat studi kasus UI/UX'],
    criteria: [
      { name: 'Kualitas riset', weight: 25 },
      { name: 'Kualitas desain', weight: 35 },
      { name: 'Dampak ke tujuan bisnis', weight: 25 },
      { name: 'Rencana pengujian', weight: 15 },
    ],
    reviewerRole: 'Product Design Lead',
    partner: PARTNERS.kirana,
  },
  'c-ai-prioritas-fitur': {
    ...AI_BASE,
    about:
      'Sebuah tim produk menerima ratusan masukan pengguna tetapi kapasitas tim terbatas. Kamu mengelompokkan masukan tersebut dan menyusun prioritas fitur yang bisa dipertanggungjawabkan.',
    activities: [
      'Mengelompokkan masukan pengguna berdasarkan tema',
      'Menilai dampak dan usaha tiap kandidat fitur',
      'Menyusun prioritas dengan kerangka yang jelas',
      'Menulis ringkasan keputusan untuk tim',
    ],
    deliverables: [
      { title: 'Tabel prioritas', description: 'Spreadsheet berisi penilaian dan urutan fitur.' },
      { title: 'Ringkasan keputusan', description: 'Alasan prioritas dalam satu halaman.' },
    ],
    skills: ['Prioritisasi (RICE)', 'Analisis feedback', 'Product thinking'],
    prerequisites: ['Dasar spreadsheet', 'Mengenal peran product manager'],
    criteria: [
      { name: 'Pengelompokan masukan', weight: 30 },
      { name: 'Logika prioritas', weight: 40 },
      { name: 'Kejelasan komunikasi', weight: 30 },
    ],
  },
  'c-b2b-kampanye-peluncuran': {
    about:
      'Mitra akan meluncurkan produk kecantikan baru untuk pasar anak muda. Kamu menyusun strategi kampanye peluncuran, mulai dari target audiens, pilihan kanal, dan anggaran, hingga KPI untuk mengukur keberhasilannya.',
    activities: [
      'Mempelajari profil produk dan target pasar dari mitra',
      'Menentukan pesan utama dan kanal kampanye',
      'Menyusun timeline dan alokasi anggaran',
      'Menetapkan KPI kampanye',
    ],
    deliverables: [
      { title: 'Dokumen strategi', description: 'Strategi kampanye lengkap dengan timeline.' },
      { title: 'Contoh materi kampanye', description: 'Contoh konten untuk kanal utama.' },
    ],
    skills: ['Strategi pemasaran', 'Segmentasi audiens', 'Perencanaan anggaran', 'Copywriting'],
    prerequisites: ['Dasar pemasaran digital'],
    criteria: [
      { name: 'Ketajaman insight audiens', weight: 30 },
      { name: 'Kualitas strategi', weight: 35 },
      { name: 'Realisme anggaran', weight: 15 },
      { name: 'Kreativitas materi', weight: 20 },
    ],
    reviewerRole: 'Brand Marketing Manager',
    partner: PARTNERS.kirana,
  },
  'c-ai-konten-sosmed': {
    ...AI_BASE,
    about:
      'Sebuah UMKM kuliner ingin lebih aktif di media sosial tetapi belum punya rencana. Kamu menyusun kalender konten satu bulan yang sesuai dengan karakter bisnis dan audiensnya, lengkap dengan tujuan dan cara mengukur hasilnya.',
    activities: [
      'Memahami profil bisnis dan audiens UMKM',
      'Menentukan pilar konten',
      'Menyusun kalender konten satu bulan',
      'Menentukan tujuan dan metrik keberhasilan',
    ],
    deliverables: [
      {
        title: 'Kalender konten',
        description: 'Spreadsheet berisi jadwal, pilar, dan ide konten.',
      },
    ],
    skills: ['Content planning', 'Social media marketing', 'Copywriting'],
    prerequisites: ['Aktif menggunakan media sosial'],
    criteria: [
      { name: 'Kesesuaian dengan audiens', weight: 40 },
      { name: 'Variasi dan konsistensi', weight: 30 },
      { name: 'Kualitas ide konten', weight: 30 },
    ],
  },
  'c-b2b-arus-kas': {
    about:
      'Mitra sedang menimbang pembukaan cabang baru dan butuh gambaran arus kas yang realistis. Kamu menyusun proyeksi arus kas 12 bulan beserta skenarionya untuk menilai kelayakan ekspansi.',
    activities: [
      'Mempelajari data keuangan historis dari mitra',
      'Menyusun asumsi dan model proyeksi arus kas',
      'Menyiapkan skenario optimis, dasar, dan pesimis',
      'Menuliskan rekomendasi keputusan',
    ],
    deliverables: [
      { title: 'Model keuangan', description: 'Spreadsheet proyeksi arus kas.' },
      { title: 'Analisis skenario', description: 'Perbandingan tiga skenario.' },
      { title: 'Memo rekomendasi', description: 'Saran keputusan untuk manajemen.' },
    ],
    skills: ['Financial modeling', 'Analisis skenario', 'Excel', 'Komunikasi bisnis'],
    prerequisites: ['Dasar akuntansi', 'Mahir spreadsheet'],
    criteria: [
      { name: 'Ketepatan model', weight: 35 },
      { name: 'Kewajaran asumsi', weight: 25 },
      { name: 'Analisis skenario', weight: 20 },
      { name: 'Kualitas rekomendasi', weight: 20 },
    ],
    reviewerRole: 'Senior Financial Analyst',
    partner: PARTNERS.bentala,
  },
  'c-ai-rekrutmen': {
    ...AI_BASE,
    about:
      'Sebuah startup akan merekrut tiga posisi pertamanya dan belum punya proses yang rapi. Kamu merancang alur rekrutmen yang adil dan efisien, lengkap dengan kriteria seleksi dan pertanyaan wawancara.',
    activities: [
      'Memahami kebutuhan peran dan kondisi startup',
      'Merancang tahapan rekrutmen',
      'Menyusun kriteria seleksi dan pertanyaan wawancara',
    ],
    deliverables: [
      { title: 'Alur rekrutmen', description: 'Diagram atau dokumen tahapan rekrutmen.' },
      {
        title: 'Kriteria & pertanyaan wawancara',
        description: 'Panduan menilai kandidat untuk tiap posisi.',
      },
    ],
    skills: ['Talent acquisition', 'Desain proses', 'Penilaian kompetensi'],
    prerequisites: ['Mengenal dasar manajemen SDM'],
    criteria: [
      { name: 'Kelengkapan alur', weight: 35 },
      { name: 'Keadilan dan objektivitas', weight: 35 },
      { name: 'Kesesuaian dengan startup', weight: 30 },
    ],
  },
  'c-ai-frontend-aksesibilitas': {
    ...AI_BASE,
    about:
      'Sebuah landing page sulit digunakan oleh pengguna pembaca layar dan keyboard. Kamu mengaudit masalah aksesibilitasnya, lalu memperbaiki kode agar memenuhi standar dasar.',
    activities: [
      'Mengaudit halaman dengan checklist aksesibilitas',
      'Mencatat dan memprioritaskan masalah',
      'Memperbaiki kode HTML, CSS, dan interaksi',
    ],
    deliverables: [
      {
        title: 'Repositori kode',
        description: 'Tautan repositori GitHub publik berisi perbaikan.',
      },
      { title: 'Laporan audit', description: 'Daftar masalah, prioritas, dan perbaikannya.' },
    ],
    skills: ['Aksesibilitas web (WCAG)', 'HTML semantik', 'CSS', 'Navigasi keyboard'],
    prerequisites: ['Dasar HTML, CSS, dan JavaScript'],
    criteria: [
      { name: 'Ketelitian audit', weight: 35 },
      { name: 'Kualitas perbaikan', weight: 45 },
      { name: 'Kejelasan laporan', weight: 20 },
    ],
  },
};
