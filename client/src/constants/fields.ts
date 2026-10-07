import {
  BarChart3,
  Calculator,
  Code2,
  LayoutTemplate,
  Megaphone,
  Monitor,
  PenTool,
  Scale,
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
    label: 'Product',
    description: 'Prioritas fitur, PRD, metrik',
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
];

export const FIELD_BY_KEY: Record<string, IFieldOption> = Object.fromEntries(
  FIELD_OPTIONS.map((field) => [field.key, field])
);

export const MAX_ONBOARDING_FIELDS = 3;

/** Opsi filter bidang ('all' = semua bidang). */
export const FIELD_FILTER_OPTIONS = [
  { value: 'all', label: 'Semua bidang' },
  ...FIELD_OPTIONS.map((field) => ({ value: field.key, label: field.label })),
];
