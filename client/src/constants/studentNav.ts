import { Award, Compass, FolderKanban, LayoutDashboard, type LucideIcon } from 'lucide-react';

import { PATHS } from './paths';

export interface INavItem {
  id: string;
  label: string;
  /** Boleh berisi query, misalnya "/my-cases?status=passed" untuk sub-menu. */
  href: string;
  icon?: LucideIcon;
  /** Ikon di kotak berwarna untuk sub-menu per tier. */
  iconTone?: 'ai' | 'brand';
  children?: INavItem[];
}

export interface INavSection {
  id: string;
  title: string;
  items: INavItem[];
}

export const STUDENT_NAV: INavSection[] = [
  {
    id: 'main',
    title: 'Utama',
    items: [{ id: 'dashboard', label: 'Dashboard', href: PATHS.dashboard, icon: LayoutDashboard }],
  },
  {
    id: 'learn',
    title: 'Belajar',
    items: [
      {
        id: 'cases',
        label: 'Jelajahi Case',
        href: PATHS.cases,
        icon: Compass,
        children: [
          { id: 'cases-ai', label: 'AI Case Study', href: `${PATHS.cases}?tier=ai` },
          { id: 'cases-b2b', label: 'B2B Case Study', href: `${PATHS.cases}?tier=b2b` },
        ],
      },
      {
        id: 'my-cases',
        label: 'Case Saya',
        href: PATHS.myCases,
        icon: FolderKanban,
        children: [
          {
            id: 'my-cases-revision',
            label: 'Perlu revisi',
            href: `${PATHS.myCases}?status=revision_requested`,
          },
          {
            id: 'my-cases-review',
            label: 'Menunggu review',
            href: `${PATHS.myCases}?status=in_review`,
          },
          { id: 'my-cases-passed', label: 'Lulus', href: `${PATHS.myCases}?status=passed` },
        ],
      },
      {
        id: 'certificates',
        label: 'Sertifikat Saya',
        href: PATHS.myCertificates,
        icon: Award,
      },
    ],
  },
];

/** Semua item (termasuk sub-menu) dalam satu daftar, untuk pencarian cepat. */
export const STUDENT_NAV_FLAT: INavItem[] = STUDENT_NAV.flatMap((section) =>
  section.items.flatMap((item) => [item, ...(item.children ?? [])])
);
