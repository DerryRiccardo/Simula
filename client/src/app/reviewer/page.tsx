import { Suspense } from 'react';

import { PageLoader } from '@/components/routing';
import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { QueueView } from './_components/QueueView';

export const metadata = createPageMetadata({
  title: 'Antrean Review',
  description: 'Submission B2B yang ditugaskan untuk dinilai, beserta riwayat keputusan.',
  path: PATHS.reviewer,
  noIndex: true,
});

export default function ReviewerPage() {
  return (
    // useSearchParams (tab antrean/riwayat) butuh Suspense agar halaman tetap bisa di-prerender.
    <Suspense fallback={<PageLoader />}>
      <QueueView />
    </Suspense>
  );
}
