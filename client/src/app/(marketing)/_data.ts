import {
  Anchor,
  Award,
  BadgeCheck,
  BarChart3,
  BookOpenCheck,
  Building2,
  ClipboardList,
  CreditCard,
  FileSearch,
  Flame,
  Handshake,
  HeartPulse,
  Hexagon,
  Layers,
  Mountain,
  Orbit,
  Route,
  ScrollText,
  Send,
  ShoppingBag,
  Sparkles,
  Sunrise,
  Target,
  UserCheck,
  UserRoundPlus,
  Waves,
  type LucideIcon,
} from 'lucide-react';

import { FIELD_BY_KEY } from '@/constants/fields';
import { PATHS } from '@/constants/paths';
import type { TTier } from '@/types';

// Konten landing page. Sumber kebenaran: prototype/CONTEXT.md (bagian 2, 4, dan 7).

export const HERO_TRUST_POINTS = [
  'Gratis untuk mulai',
  'Dinilai praktisi industri',
  'Sertifikat terverifikasi',
] as const;

// PLACEHOLDER: nama perusahaan fiktif untuk prototype. Ganti dengan mitra resmi (dan logonya)
// sebelum dipublikasikan; jangan memakai nama brand nyata tanpa perjanjian kerja sama.
export const PARTNERS: { name: string; icon: LucideIcon }[] = [
  { name: 'Arunika Tech', icon: Sunrise },
  { name: 'Kirana Retail', icon: ShoppingBag },
  { name: 'Samudra Logistik', icon: Anchor },
  { name: 'Bentala Finance', icon: Hexagon },
  { name: 'Lintas Media', icon: Orbit },
  { name: 'Nara Health', icon: HeartPulse },
  { name: 'Cakra Energi', icon: Flame },
  { name: 'Sagara Commerce', icon: Waves },
  { name: 'Giri Konstruksi', icon: Mountain },
];

export interface IStat {
  value: number;
  decimals?: number;
  suffix: string;
  label: string;
}

// PLACEHOLDER: angka ilustratif untuk prototype/presentasi. Ganti dengan data asli sebelum rilis.
export const STATS: IStat[] = [
  { value: 12500, suffix: '+', label: 'Mahasiswa & fresh graduate bergabung' },
  { value: 150, suffix: '+', label: 'Case study dari kebutuhan industri' },
  { value: 40, suffix: '+', label: 'Perusahaan mitra penyedia brief' },
  { value: 25, suffix: '+', label: 'Bidang studi tersedia' },
  { value: 4.8, decimals: 1, suffix: '/5', label: 'Rating kepuasan peserta' },
];

export interface IReviewer {
  id: string;
  name: string;
  role: string;
  company: string;
  experience: string;
  fieldKey: string;
}

// PLACEHOLDER: reviewer fiktif untuk prototype. Ganti dengan praktisi mitra asli (dengan izin,
// beserta foto) sebelum dipublikasikan.
export const REVIEWERS: IReviewer[] = [
  {
    id: 'r1',
    name: 'Andika Pratama',
    role: 'Senior Backend Engineer',
    company: 'Sagara Commerce',
    experience: '8 tahun',
    fieldKey: 'backend',
  },
  {
    id: 'r2',
    name: 'Laras Wibowo',
    role: 'Lead Data Analyst',
    company: 'Samudra Logistik',
    experience: '7 tahun',
    fieldKey: 'data',
  },
  {
    id: 'r3',
    name: 'Yohana Situmorang',
    role: 'Head of Growth Marketing',
    company: 'Kirana Retail',
    experience: '10 tahun',
    fieldKey: 'marketing',
  },
  {
    id: 'r4',
    name: 'Reza Maulana',
    role: 'Finance Manager',
    company: 'Bentala Finance',
    experience: '9 tahun',
    fieldKey: 'finance',
  },
];

export interface ITestimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  tier: TTier;
}

// PLACEHOLDER: testimoni ilustratif untuk prototype. Ganti dengan testimoni asli (dengan izin)
// sebelum dipublikasikan.
export const TESTIMONIALS: ITestimonial[] = [
  {
    id: 't1',
    quote:
      'Feedback per kriteria bikin saya tahu persis bagian mana yang lemah. Bukan cuma skor, tapi alasannya juga jelas.',
    name: 'Rahma A.',
    role: 'Mahasiswa tingkat akhir, Sistem Informasi',
    tier: 'ai',
  },
  {
    id: 't2',
    quote:
      'Brief-nya terasa seperti tugas kerja sungguhan. Saya belajar menulis trade-off memo, hal yang tidak pernah diajarkan di kelas.',
    name: 'Dimas P.',
    role: 'Fresh graduate, Teknik Informatika',
    tier: 'b2b',
  },
  {
    id: 't3',
    quote:
      'Sebagai anak manajemen, senang ada case yang bukan coding. Case marketing-nya realistis dan rubriknya transparan.',
    name: 'Nadia S.',
    role: 'Mahasiswa tingkat akhir, Manajemen',
    tier: 'ai',
  },
  {
    id: 't4',
    quote:
      'Review dari praktisi sangat detail. Sempat diminta revisi karena satu deliverable kurang, tapi justru itu yang bikin hasil akhirnya rapi.',
    name: 'Fajar R.',
    role: 'Fresh graduate, Statistika',
    tier: 'b2b',
  },
  {
    id: 't5',
    quote:
      'Sertifikatnya bisa diverifikasi, jadi saya pasang di LinkedIn dan CV tanpa ragu. Recruiter juga bisa cek sendiri.',
    name: 'Clara W.',
    role: 'Fresh graduate, Desain Komunikasi Visual',
    tier: 'b2b',
  },
  {
    id: 't6',
    quote:
      'Mulai dari AI case yang gratis dulu, baru setelah skor stabil saya coba B2B. Alurnya jelas dan tidak membingungkan.',
    name: 'Bima K.',
    role: 'Mahasiswa tingkat akhir, Akuntansi',
    tier: 'ai',
  },
];

export interface IProductCard {
  tier: TTier;
  icon: LucideIcon;
  name: string;
  price: string;
  priceSuffix: string;
  description: string;
  features: string[];
  cta: { label: string; href: string };
  note?: string;
}

export const PRODUCTS: IProductCard[] = [
  {
    tier: 'ai',
    icon: Sparkles,
    name: 'AI Case Study',
    price: 'Gratis',
    priceSuffix: '/ tanpa kartu kredit',
    description:
      'Cocok untuk belajar dan mengenali skill gap-mu lewat case study yang disusun dari kebutuhan umum industri.',
    features: [
      'Dinilai AI berdasarkan rubrik',
      'Selesai dalam 2–4 jam, sekali submit',
      'Skor & feedback per kriteria instan',
      'Ringkasan skill gap pribadi',
      'Sertifikat dari platform',
    ],
    cta: { label: 'Mulai Gratis', href: `${PATHS.cases}?tier=ai` },
  },
  {
    tier: 'b2b',
    icon: Building2,
    name: 'B2B Case Study',
    price: 'Berbayar',
    priceSuffix: '/ per case atau bundle',
    description:
      'Untuk kamu yang siap membuktikan kompetensi lewat brief nyata dari perusahaan mitra.',
    features: [
      'Dinilai praktisi perusahaan mitra',
      'Dikerjakan 3–7 hari, bisa dicicil',
      'Feedback personal dari reviewer',
      'Sertifikat resmi berlogo mitra',
      'Kesempatan masuk daftar prioritas interview',
    ],
    cta: { label: 'Lihat B2B Case Study', href: `${PATHS.cases}?tier=b2b` },
    note: 'Pembelian tidak menjamin panggilan interview. Kesempatan ditentukan oleh skor dan rekomendasi reviewer.',
  },
];

export interface IStep {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const STEPS: Record<TTier, IStep[]> = {
  ai: [
    {
      icon: UserRoundPlus,
      title: 'Daftar & pilih bidang',
      description: 'Tentukan bidang yang ingin kamu tekuni.',
    },
    {
      icon: FileSearch,
      title: 'Pilih case gratis',
      description: 'Telusuri katalog AI Case Study di bidangmu.',
    },
    {
      icon: Send,
      title: 'Kerjakan & submit',
      description: 'Baca brief lengkap, kerjakan, lalu kirim hasilnya.',
    },
    {
      icon: Sparkles,
      title: 'Dinilai AI',
      description: 'Skor dan feedback per kriteria keluar dalam hitungan menit.',
    },
    {
      icon: Award,
      title: 'Hasil & sertifikat',
      description: 'Kenali skill gap-mu, lalu lanjut ke case berikutnya.',
    },
  ],
  b2b: [
    {
      icon: Building2,
      title: 'Pilih case B2B',
      description: 'Lihat ringkasan case, perusahaan mitra, dan harga.',
    },
    {
      icon: CreditCard,
      title: 'Bayar akses',
      description: 'Case langsung masuk ke daftar Case Saya.',
    },
    {
      icon: ClipboardList,
      title: 'Kerjakan & submit',
      description: 'Kerjakan beberapa deliverable dalam 3–7 hari, bisa disimpan sebagai draft.',
    },
    {
      icon: UserCheck,
      title: 'Review praktisi',
      description: 'Dinilai dengan rubrik berbobot. Jika belum lengkap, kamu diminta revisi.',
    },
    {
      icon: BadgeCheck,
      title: 'Sertifikat & feedback',
      description: 'Skor tinggi berkesempatan masuk daftar prioritas interview mitra.',
    },
  ],
};

export interface IBenefit extends IStep {
  tags?: string[];
}

// Kartu dengan `tags` ditampilkan lebar (bento) sebagai kartu pertama.
export const BENEFITS: IBenefit[] = [
  {
    icon: Layers,
    title: 'Berbagai bidang studi, bukan hanya teknologi',
    description: 'Pilih case yang sesuai jurusan atau karier yang kamu tuju.',
    tags: [
      ...['backend', 'data', 'uiux', 'marketing', 'finance', 'hr'].map(
        (key) => FIELD_BY_KEY[key].label
      ),
      'dan lainnya',
    ],
  },
  {
    icon: Target,
    title: 'Relevan dengan industri Indonesia',
    description:
      'Case disusun dari kebutuhan nyata industri dan brief perusahaan mitra, bukan materi generik.',
  },
  {
    icon: Route,
    title: 'Satu alur yang terhubung',
    description: 'Mulai gratis untuk belajar, lalu naik ke validasi oleh praktisi saat kamu siap.',
  },
  {
    icon: BarChart3,
    title: 'Penilaian yang transparan',
    description: 'Setiap case punya rubrik berbobot yang bisa kamu baca sebelum mengerjakan.',
  },
  {
    icon: BadgeCheck,
    title: 'Sertifikat yang bisa diverifikasi',
    description: 'Setiap sertifikat punya tautan verifikasi publik untuk recruiter dan HR.',
  },
];

export const PARTNER_POINTS: IStep[] = [
  {
    icon: ScrollText,
    title: 'Brief dari masalah bisnismu',
    description:
      'Tim kami mengemas masalah nyata perusahaanmu menjadi case study lengkap dengan rubrik.',
  },
  {
    icon: BookOpenCheck,
    title: 'Dinilai oleh praktisimu',
    description:
      'Reviewer dari timmu menilai submission kandidat secara anonim dengan rubrik yang sama.',
  },
  {
    icon: Handshake,
    title: 'Kandidat yang sudah teruji',
    description:
      'Kandidat berskor tinggi yang direkomendasikan reviewer masuk daftar prioritas rekrutmenmu.',
  },
];

export const FAQS = [
  {
    id: 'cocok-untuk-siapa',
    question: 'Siapa yang cocok memakai platform ini?',
    answer:
      'Mahasiswa tingkat akhir dan fresh graduate dari berbagai bidang studi yang ingin membangun pengalaman kerja praktis sebelum melamar pekerjaan pertama.',
  },
  {
    id: 'ai-gratis',
    question: 'Apakah AI Case Study benar-benar gratis?',
    answer:
      'Ya. AI Case Study gratis, termasuk skor, feedback per kriteria, dan sertifikat dari platform jika kamu lulus.',
  },
  {
    id: 'beda-ai-b2b',
    question: 'Apa bedanya AI Case Study dan B2B Case Study?',
    answer:
      'AI Case Study disusun tim kami dan dinilai AI secara instan, cocok untuk belajar. B2B Case Study berasal dari perusahaan mitra, dikerjakan 3–7 hari, dan dinilai langsung oleh praktisi perusahaan tersebut.',
  },
  {
    id: 'penilaian-b2b',
    question: 'Bagaimana B2B Case Study dinilai?',
    answer:
      'Reviewer dari perusahaan mitra menilai hasil kerjamu dengan rubrik berbobot yang bisa kamu baca sejak awal. Jika submission belum lengkap atau tidak sesuai brief, reviewer akan mengembalikannya untuk revisi sebelum dinilai.',
  },
  {
    id: 'jaminan-interview',
    question: 'Apakah membeli B2B Case Study menjamin saya dipanggil interview?',
    answer:
      'Tidak. Pembelian memberi kamu kesempatan dinilai oleh praktisi. Kandidat dengan skor tinggi yang direkomendasikan reviewer berkesempatan masuk daftar prioritas interview perusahaan mitra, dan profilmu hanya dibagikan setelah kamu menyetujuinya.',
  },
  {
    id: 'sertifikat',
    question: 'Apa bedanya sertifikat kedua produk?',
    answer:
      'Sertifikat AI Case Study diterbitkan oleh platform. Sertifikat B2B Case Study resmi dan berlogo perusahaan mitra. Keduanya punya tautan verifikasi publik.',
  },
] as const;
