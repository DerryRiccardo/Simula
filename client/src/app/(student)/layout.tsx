import { RequireAuth } from '@/components/routing';
import { StudentShell } from '@/components/student/StudentShell';

// Semua halaman dashboard mahasiswa: wajib masuk sebagai mahasiswa yang sudah onboarding.
export default function StudentLayout({ children }: LayoutProps<'/'>) {
  return (
    <RequireAuth roles={['student']}>
      <StudentShell>{children}</StudentShell>
    </RequireAuth>
  );
}
