'use client';

import { usePathname } from 'next/navigation';

import { Breadcrumb, type IBreadcrumbItem } from '@/components/layout/Breadcrumb';
import { PATHS } from '@/constants/paths';

/** "Antrean review / Review submission"; antrean bisa diklik untuk kembali. */
function getItems(pathname: string): IBreadcrumbItem[] {
  if (pathname.startsWith(`${PATHS.reviewer}/submissions/`)) {
    return [{ label: 'Antrean review', href: PATHS.reviewer }, { label: 'Review submission' }];
  }
  return [{ label: 'Antrean review' }];
}

export function ReviewerBreadcrumb() {
  const pathname = usePathname();
  return <Breadcrumb items={getItems(pathname)} />;
}
