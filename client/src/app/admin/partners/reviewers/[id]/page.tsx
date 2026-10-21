import { Suspense } from 'react';

import { PageLoader } from '@/components/routing';
import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { ReviewerAssignmentView } from './_components/ReviewerAssignmentView';

export async function generateMetadata({ params }: PageProps<'/admin/partners/reviewers/[id]'>) {
  const { id } = await params;
  return createPageMetadata({
    title: 'Penugasan Reviewer',
    description: 'Tugaskan atau lepas B2B case untuk satu reviewer mitra.',
    path: PATHS.adminReviewerAssignments(decodeURIComponent(id)),
    noIndex: true,
  });
}

export default async function ReviewerAssignmentPage({
  params,
}: PageProps<'/admin/partners/reviewers/[id]'>) {
  const { id } = await params;
  return (
    // Filter dan pencarian disimpan di URL (useSearchParams).
    <Suspense fallback={<PageLoader />}>
      <ReviewerAssignmentView id={decodeURIComponent(id)} />
    </Suspense>
  );
}
