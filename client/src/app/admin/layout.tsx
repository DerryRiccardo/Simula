import { Suspense } from 'react';

import { AdminShell } from '@/components/admin';
import { PageLoader, RequireAuth } from '@/components/routing';

// Semua halaman panel admin: wajib masuk sebagai admin platform.
export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <RequireAuth roles={['admin']}>
      {/* Breadcrumb dan menu aktif membaca query (?tier, ?status), jadi butuh Suspense. */}
      <Suspense fallback={<PageLoader />}>
        <AdminShell>{children}</AdminShell>
      </Suspense>
    </RequireAuth>
  );
}
