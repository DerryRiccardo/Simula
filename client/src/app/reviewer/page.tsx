import { Suspense } from 'react';

import { WorkspacePlaceholder } from '@/components/app/WorkspacePlaceholder';
import { PageLoader, RequireAuth } from '@/components/routing';
import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Portal Reviewer',
  path: PATHS.reviewer,
  noIndex: true,
});

export default function ReviewerPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <RequireAuth roles={['reviewer']}>
        <WorkspacePlaceholder
          title="selamat datang di portal reviewer."
          description="Di sini nanti kamu melihat antrean submission dan menilainya dengan rubrik."
        />
      </RequireAuth>
    </Suspense>
  );
}
