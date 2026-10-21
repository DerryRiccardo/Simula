import { Suspense } from 'react';

import { PageLoader } from '@/components/routing';
import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { PartnersView } from './_components/PartnersView';

export const metadata = createPageMetadata({
  title: 'Reviewer & Mitra',
  description: 'Perusahaan mitra, reviewer praktisi, dan penugasan case B2B.',
  path: PATHS.adminPartners,
  noIndex: true,
});

export default function AdminPartnersPage() {
  return (
    // useSearchParams (tab dan filter di URL) butuh Suspense agar halaman tetap bisa di-prerender.
    <Suspense fallback={<PageLoader />}>
      <PartnersView />
    </Suspense>
  );
}
