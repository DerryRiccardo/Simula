import { Suspense } from 'react';

import { PageLoader } from '@/components/routing';
import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { TalentPoolView } from './_components/TalentPoolView';

export const metadata = createPageMetadata({
  title: 'Talent pool',
  description: 'Kandidat yang direkomendasikan reviewer ke daftar prioritas interview.',
  path: PATHS.adminTalentPool,
  noIndex: true,
});

export default function AdminTalentPoolPage() {
  return (
    // useSearchParams (filter di URL) butuh Suspense agar halaman tetap bisa di-prerender.
    <Suspense fallback={<PageLoader />}>
      <TalentPoolView />
    </Suspense>
  );
}
