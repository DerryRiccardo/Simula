import {
  Building2,
  ClipboardCheck,
  FilePen,
  FolderKanban,
  Handshake,
  LayoutDashboard,
  Receipt,
  Settings,
  Shapes,
  Sparkles,
  UserRoundCheck,
  Users,
} from 'lucide-react';

import { PATHS } from './paths';
import type { INavItem, INavSection } from './studentNav';

// Menu panel admin (prototype/CONTEXT.md 4.13). Sub-menu Case dan Penilaian adalah filter di URL
// halaman induknya, bukan halaman terpisah. "Buat case baru" ada di halaman daftar case.
export const ADMIN_NAV: INavSection[] = [
  {
    id: 'overview',
    title: 'Ikhtisar',
    items: [{ id: 'dashboard', label: 'Dashboard', href: PATHS.admin, icon: LayoutDashboard }],
  },
  {
    id: 'content',
    title: 'Konten',
    items: [
      {
        id: 'cases',
        label: 'Case',
        href: PATHS.adminCases,
        icon: FolderKanban,
        children: [
          {
            id: 'cases-ai',
            label: 'AI Case Study',
            href: `${PATHS.adminCases}?tier=ai`,
            icon: Sparkles,
            iconTone: 'ai',
          },
          {
            id: 'cases-b2b',
            label: 'B2B Case Study',
            href: `${PATHS.adminCases}?tier=b2b`,
            icon: Building2,
            iconTone: 'brand',
          },
          {
            id: 'cases-draft',
            label: 'Draft',
            href: `${PATHS.adminCases}?status=draft`,
            icon: FilePen,
          },
        ],
      },
      { id: 'fields', label: 'Bidang studi', href: PATHS.adminFields, icon: Shapes },
    ],
  },
  {
    id: 'grading',
    title: 'Penilaian',
    items: [
      {
        id: 'reviews',
        label: 'Penilaian',
        href: PATHS.adminReviews,
        icon: ClipboardCheck,
        children: [
          {
            id: 'reviews-ai',
            label: 'AI Case',
            href: `${PATHS.adminReviews}?tier=ai`,
            icon: Sparkles,
            iconTone: 'ai',
          },
          {
            id: 'reviews-b2b',
            label: 'B2B Case',
            href: `${PATHS.adminReviews}?tier=b2b`,
            icon: Building2,
            iconTone: 'brand',
          },
        ],
      },
    ],
  },
  {
    id: 'people',
    title: 'Pengguna & Mitra',
    items: [
      { id: 'members', label: 'Member', href: PATHS.adminMembers, icon: Users },
      { id: 'partners', label: 'Reviewer & Mitra', href: PATHS.adminPartners, icon: Handshake },
      {
        id: 'talent-pool',
        label: 'Talent pool',
        href: PATHS.adminTalentPool,
        icon: UserRoundCheck,
      },
    ],
  },
  {
    id: 'transactions',
    title: 'Transaksi',
    items: [{ id: 'orders', label: 'Order', href: PATHS.adminOrders, icon: Receipt }],
  },
  {
    id: 'system',
    title: 'Sistem',
    items: [{ id: 'settings', label: 'Pengaturan', href: PATHS.adminSettings, icon: Settings }],
  },
];

/** Menu yang hanya aktif bila path sama persis (Dashboard adalah induk semua path /admin). */
export const ADMIN_EXACT_NAV_IDS = ['dashboard'];

/** Item menu dan grupnya untuk path ini; sub-menu dicocokkan dengan query di URL. */
export function findAdminNavMatch(
  pathname: string,
  isMatch: (item: INavItem, isPrefix: boolean) => boolean
) {
  for (const section of ADMIN_NAV) {
    for (const item of section.items) {
      if (!isMatch(item, !ADMIN_EXACT_NAV_IDS.includes(item.id))) continue;
      const child = item.children?.find((entry) => isMatch(entry, false));
      return { section, item, child };
    }
  }
  return null;
}
