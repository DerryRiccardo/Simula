import { Suspense } from 'react';

import { PageLoader } from '@/components/routing';
import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { AdminCasesView } from './_components/AdminCasesView';

export const metadata = createPageMetadata({
  title: 'Kelola Case',
  description: 'Daftar case AI dan B2B, draft maupun terbit.',
  path: PATHS.adminCases,
  noIndex: true,
});

export default function AdminCasesPage() {
  return (
    // useSearchParams (filter di URL) butuh Suspense agar halaman tetap bisa di-prerender.
    <Suspense fallback={<PageLoader />}>
      <AdminCasesView />
    </Suspense>
  );
}
