import { Suspense } from 'react';

import { WorkspacePlaceholder } from '@/components/app/WorkspacePlaceholder';
import { PageLoader, RequireAuth } from '@/components/routing';
import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';

export const metadata = createPageMetadata({
  title: 'Kelola Case',
  path: PATHS.admin,
  noIndex: true,
});

export default function AdminCasesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <RequireAuth roles={['admin']}>
        <WorkspacePlaceholder
          title="selamat datang di panel admin."
          description="Di sini nanti kamu membuat case study, menyusun rubrik, dan menugaskan reviewer."
        />
      </RequireAuth>
    </Suspense>
  );
}
