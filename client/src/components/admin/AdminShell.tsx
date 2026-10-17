'use client';

import type { ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

import { DashboardShell } from '@/components/layout/DashboardShell';
import { ADMIN_NAV } from '@/constants/adminNav';
import { PATHS } from '@/constants/paths';
import { matchesNavHref } from '@/lib/navigation';
import { AdminSidebar } from './AdminSidebar';

/** "Konten / Case / AI Case Study", atau nama halaman pembuat case. */
function getBreadcrumb(pathname: string, searchParams: URLSearchParams) {
  const section = ADMIN_NAV[0];
  if (pathname === PATHS.adminCaseNew) return [section.title, 'Buat case baru'];
  if (pathname.endsWith('/edit')) return [section.title, 'Case', 'Edit'];
  const child = section.items[0].children?.find((item) =>
    matchesNavHref(item.href, pathname, searchParams, false)
  );
  return child ? [section.title, 'Case', child.label] : [section.title, 'Case'];
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
