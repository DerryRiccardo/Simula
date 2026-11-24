import {
  Award,
  BadgeCheck,
  BarChart3,
  BookOpenCheck,
  Building2,
  ClipboardList,
  CreditCard,
  FileSearch,
  Handshake,
  Layers,
  Route,
  ScrollText,
  Send,
  Sparkles,
  Target,
  UserCheck,
  UserRoundPlus,
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

export const PARTNERS: { name: string; logo: string }[] = [
  { name: 'Astral', logo: '/partner/astral.svg' },
  { name: 'BCAA', logo: '/partner/bcaa.svg' },
  { name: 'Belibeli', logo: '/partner/belibeli.svg' },
  { name: 'Danah', logo: '/partner/danah.svg' },
  { name: 'Halodek', logo: '/partner/halodek.svg' },
  { name: 'Kopi Memory', logo: '/partner/kopi_memory.svg' },
  { name: 'Paragone Corp', logo: '/partner/paragonecorp.svg' },
  { name: 'Sayap', logo: '/partner/sayap.svg' },
  { name: 'Travelokal', logo: '/partner/travelokal.svg' },
  { name: 'Univeler', logo: '/partner/univeler.svg' },
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
  focus: string;
  fieldKey: string;
  photo: string;
}

export const REVIEWERS: IReviewer[] = [
  {
    id: 'r1',
    name: 'Raditya Wilson',
    role: 'Senior Backend Engineer',
    company: 'Belibeli',
    experience: '8 tahun',
    focus: 'API, arsitektur & skalabilitas',
    fieldKey: 'backend',
    photo: '/reviewer/raditya_wilson.jpg',
  },
  {
    id: 'r2',
    name: 'Drian Chang',
    role: 'Lead Data Analyst',
    company: 'Travelokal',
    experience: '7 tahun',
    focus: 'SQL, analitik & insight bisnis',
    fieldKey: 'data',
    photo: '/reviewer/drian_chang.jpg',
  },
  {
    id: 'r3',
    name: 'Laras Wibowo',
    role: 'Head of Growth Marketing',
    company: 'Univeler',
    experience: '10 tahun',
    focus: 'Strategi kampanye & growth',
    fieldKey: 'marketing',
    photo: '/reviewer/laras_wibowo.jpg',
  },
  {
    id: 'r4',
    name: 'Amba Pratama',
    role: 'Finance Manager',
    company: 'Danah',
    experience: '9 tahun',
    focus: 'Proyeksi kas & analisis finansial',
    fieldKey: 'finance',
    photo: '/reviewer/amba_pratama.jpg',
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
      'Kerjakan sesuai waktumu, sekali submit',
      'Skor & feedback per kriteria instan',
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
      'Feedback personal dari reviewer',
      'Sertifikat resmi berlogo mitra',
      'Kesempatan masuk daftar prioritas interview',
    ],
    note: 'Pembelian tidak menjamin panggilan interview. Kesempatan ditentukan oleh skor dan rekomendasi reviewer.',
    cta: { label: 'Lihat B2B Case Study', href: `${PATHS.cases}?tier=b2b` },
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
      description: 'Buat akun dan tentukan bidang yang ingin kamu tekuni.',
    },
    {
      icon: FileSearch,
      title: 'Pilih case gratis',
      description: 'Telusuri dan pilih AI Case Study gratis di bidangmu.',
    },
    {
      icon: Send,
      title: 'Kerjakan & submit',
      description: 'Baca brief lengkap, kerjakan, lalu kirim hasilnya.',
    },
    {
      icon: Sparkles,
      title: 'Dinilai AI',
      description: 'AI menilai hasilmu dengan skor dan feedback per kriteria secara instan.',
    },
    {
      icon: Award,
      title: 'Hasil & sertifikat',
      description: 'Lihat hasil penilaian dan unduh sertifikat dari platform.',
    },
  ],
  b2b: [
    {
      icon: Building2,
      title: 'Pilih case B2B',
      description: 'Telusuri brief perusahaan mitra dan pilih case B2B yang sesuai.',
    },
    {
      icon: CreditCard,
      title: 'Bayar akses',
      description: 'Selesaikan pembayaran agar case langsung terbuka di Case Saya.',
    },
    {
      icon: ClipboardList,
      title: 'Kerjakan & submit',
      description: 'Kerjakan deliverable sesuai waktumu, simpan draft, lalu submit hasilnya.',
    },
    {
      icon: UserCheck,
      title: 'Review praktisi',
      description: 'Praktisi perusahaan mitra menilai hasilmu sesuai rubrik, dengan opsi revisi.',
    },
    {
      icon: BadgeCheck,
      title: 'Sertifikat & feedback',
      description:
        'Dapatkan feedback personal, sertifikat berlogo mitra, dan kesempatan masuk daftar prioritas interview.',
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
      'AI Case Study disusun tim kami dan dinilai AI secara instan, cocok untuk belajar. B2B Case Study berasal dari perusahaan mitra, dikerjakan fleksibel tanpa tenggat waktu, dan dinilai langsung oleh praktisi perusahaan tersebut.',
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
