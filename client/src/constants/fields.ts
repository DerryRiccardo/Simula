import {
  BarChart3,
  Briefcase,
  Calculator,
  CheckCircle2,
  Code2,
  LayoutTemplate,
  Megaphone,
  Monitor,
  PenTool,
  Scale,
  ServerCog,
  Shapes,
  ShieldCheck,
  Smartphone,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface IFieldOption {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

// Taksonomi bidang studi. Dipakai di landing page dan onboarding; `key` dikirim ke backend.
export const FIELD_OPTIONS: IFieldOption[] = [
  { key: 'backend', label: 'Back-End', description: 'API, database, performa sistem', icon: Code2 },
  {
    key: 'frontend',
    label: 'Front-End',
    description: 'Antarmuka web, aksesibilitas',
    icon: Monitor,
  },
  { key: 'mobile', label: 'Mobile', description: 'Aplikasi Android & iOS', icon: Smartphone },
  { key: 'data', label: 'Data', description: 'SQL, dashboard, insight bisnis', icon: BarChart3 },
  {
    key: 'uiux',
    label: 'UI/UX Design',
    description: 'Riset pengguna, alur, prototipe',
    icon: PenTool,
  },
  {
    key: 'product',
    label: 'Product Management',
    description: 'Prioritas fitur, PRD, timeline, koordinasi tim',
    icon: LayoutTemplate,
  },
  { key: 'marketing', label: 'Marketing', description: 'Kampanye, kanal, KPI', icon: Megaphone },
  {
    key: 'finance',
    label: 'Keuangan',
    description: 'Laporan, anggaran, proyeksi',
    icon: Calculator,
  },
  { key: 'accounting', label: 'Akuntansi', description: 'Pencatatan, audit, pajak', icon: Wallet },
  {
    key: 'hr',
    label: 'Human Resources',
    description: 'Rekrutmen, kebijakan, engagement',
    icon: Users,
  },
  {
    key: 'supply-chain',
    label: 'Supply Chain',
    description: 'Inventori, distribusi, vendor',
    icon: Truck,
  },
  { key: 'legal', label: 'Legal', description: 'Kontrak, kepatuhan, regulasi', icon: Scale },
  {
    key: 'business-development',
    label: 'Business Development',
    description: 'Kemitraan, penjualan, ekspansi pasar',
    icon: Briefcase,
  },
  {
    key: 'qa',
    label: 'Quality Assurance',
    description: 'Pengujian sistem, test case, bug tracking',
    icon: CheckCircle2,
  },
  {
    key: 'devops',
    label: 'DevOps',
    description: 'CI/CD, cloud, infrastruktur, otomasi',
    icon: ServerCog,
  },
  {
    key: 'cyber-security',
    label: 'Cyber Security',
    description: 'Keamanan jaringan, audit, proteksi data',
    icon: ShieldCheck,
  },
];

export const FIELD_BY_KEY: Record<string, IFieldOption> = Object.fromEntries(
  FIELD_OPTIONS.map((field) => [field.key, field])
);

export const DEFAULT_FIELD_ICON: LucideIcon = Shapes;

export function getFieldIcon(key: string): LucideIcon {
  return FIELD_BY_KEY[key]?.icon ?? DEFAULT_FIELD_ICON;
}

export const MAX_ONBOARDING_FIELDS = 3;

/** Opsi filter bidang ('all' = semua bidang). */
export const FIELD_FILTER_OPTIONS = [
  { value: 'all', label: 'Semua bidang' },
  ...FIELD_OPTIONS.map((field) => ({ value: field.key, label: field.label })),
];
