import { Suspense } from 'react';

import { ListSkeleton } from '@/components';
import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { MyCasesView } from './_components/MyCasesView';

export const metadata = createPageMetadata({
  title: 'Case Saya',
  path: PATHS.myCases,
  noIndex: true,
});

export default function MyCasesPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <MyCasesView />
    </Suspense>
  );
}
