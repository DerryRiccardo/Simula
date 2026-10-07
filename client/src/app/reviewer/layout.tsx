import { ReviewerShell } from '@/components/reviewer';
import { RequireAuth } from '@/components/routing';

// Semua halaman portal reviewer: wajib masuk sebagai reviewer mitra.
export default function ReviewerLayout({ children }: LayoutProps<'/reviewer'>) {
  return (
    <RequireAuth roles={['reviewer']}>
      <ReviewerShell>{children}</ReviewerShell>
    </RequireAuth>
  );
}
