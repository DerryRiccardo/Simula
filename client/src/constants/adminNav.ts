import { Building2, FilePen, FilePlus2, FolderKanban, Sparkles } from 'lucide-react';

import { PATHS } from './paths';
import type { INavSection } from './studentNav';

// Menu panel admin (prototype/CONTEXT.md 4.11). Sub-menu Case memakai filter di URL daftar case.
export const ADMIN_NAV: INavSection[] = [
  {
    id: 'content',
    title: 'Konten',
    items: [
      {
        id: 'cases',
        label: 'Case',
        href: PATHS.admin,
        icon: FolderKanban,
        children: [
          {
            id: 'cases-ai',
            label: 'AI Case Study',
            href: `${PATHS.admin}?tier=ai`,
            icon: Sparkles,
            iconTone: 'ai',
          },
          {
            id: 'cases-b2b',
            label: 'B2B Case Study',
            href: `${PATHS.admin}?tier=b2b`,
            icon: Building2,
            iconTone: 'brand',
          },
          { id: 'cases-draft', label: 'Draft', href: `${PATHS.admin}?status=draft`, icon: FilePen },
        ],
      },
      { id: 'case-new', label: 'Buat case baru', href: PATHS.adminCaseNew, icon: FilePlus2 },
    ],
  },
];
