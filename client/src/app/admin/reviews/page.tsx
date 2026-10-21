import { Suspense } from 'react';

import { PageLoader } from '@/components/routing';
import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { ReviewsView } from './_components/ReviewsView';

export const metadata = createPageMetadata({
  title: 'Penilaian',
  description: 'Pengawasan penilaian AI Case dan review praktisi untuk B2B Case.',
  path: PATHS.adminReviews,
  noIndex: true,
});

export default function AdminReviewsPage() {
  return (
    // useSearchParams (tier dan filter di URL) butuh Suspense agar halaman tetap bisa di-prerender.
    <Suspense fallback={<PageLoader />}>
      <ReviewsView />
    </Suspense>
  );
}
