'use client';

import type { ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import type { IBreadcrumbItem } from '@/components/layout/Breadcrumb';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { findAdminNavMatch } from '@/constants/adminNav';
import { PATHS } from '@/constants/paths';
import { matchesNavHref } from '@/lib/navigation';
import { AdminSidebar } from './AdminSidebar';

/**
 * "Konten / Case / AI Case Study", atau halaman turunan (Edit, Detail, Penugasan) di bawah menu.
 * Grup menu hanya judul; menu dan sub-menu di atas halaman aktif bisa diklik untuk kembali.
 */
function getBreadcrumb(pathname: string, searchParams: URLSearchParams): IBreadcrumbItem[] {
  const match = findAdminNavMatch(pathname, (item, isPrefix) =>
    matchesNavHref(item.href, pathname, searchParams, isPrefix)
  );
  if (!match) return [{ label: 'Panel admin', href: PATHS.admin }];
  const { section, item, child } = match;
  // Grup berisi satu menu bernama sama (Penilaian), cukup ditulis sekali.
  const group: IBreadcrumbItem[] = section.title === item.label ? [] : [{ label: section.title }];
  const isSubpage = pathname.startsWith(`${item.href}/`);
  const isReviewerAssignment = pathname.startsWith(`${item.href}/reviewers/`);

  if (isSubpage) {
    const subpage =
      pathname === PATHS.adminCaseNew
        ? 'Buat case baru'
        : pathname.endsWith('/edit')
          ? 'Edit'
          : isReviewerAssignment
            ? 'Penugasan'
            : 'Detail';
    // Penugasan dibuka dari tab Reviewer, jadi "kembali" mengarah ke tab itu.
    const parentHref = isReviewerAssignment ? `${item.href}?tab=reviewers` : item.href;
    return [...group, { label: item.label, href: parentHref }, { label: subpage }];
  }
  return child
    ? [...group, { label: item.label, href: item.href }, { label: child.label }]
    : [...group, { label: item.label }];
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <DashboardShell
      breadcrumb={getBreadcrumb(pathname, searchParams)}
      renderSidebar={(onNavigate) => <AdminSidebar onNavigate={onNavigate} />}
    >
      {children}
    </DashboardShell>
  );
}
