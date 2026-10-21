import { Suspense } from 'react';

import { PageLoader, RequireAuth } from '@/components/routing';
import { StudentShell } from '@/components/student/StudentShell';

// Semua halaman dashboard mahasiswa: wajib masuk sebagai mahasiswa yang sudah onboarding.
export default function StudentLayout({ children }: LayoutProps<'/'>) {
  return (
    <RequireAuth roles={['student']}>
      {/* Breadcrumb membaca query sub-menu (?tier, ?status), jadi butuh Suspense. */}
      <Suspense fallback={<PageLoader />}>
        <StudentShell>{children}</StudentShell>
      </Suspense>
    </RequireAuth>
  );
}
