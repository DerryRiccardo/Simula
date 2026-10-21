import { PortalShell, ReviewerBreadcrumb } from '@/components/portal';
import { RequireAuth } from '@/components/routing';

// Semua halaman portal reviewer: wajib masuk sebagai reviewer mitra.
export default function ReviewerLayout({ children }: LayoutProps<'/reviewer'>) {
  return (
    <RequireAuth roles={['reviewer']}>
      <PortalShell
        label="Portal reviewer"
        roleLabel="Reviewer mitra"
        breadcrumb={<ReviewerBreadcrumb />}
      >
        {children}
      </PortalShell>
    </RequireAuth>
  );
}
