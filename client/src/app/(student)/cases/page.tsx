import { Suspense } from 'react';

import { CardGridSkeleton } from '@/components';
import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { CatalogView } from './_components/CatalogView';

export const metadata = createPageMetadata({
  title: 'Jelajahi Case',
  description: 'Temukan AI Case Study gratis dan B2B Case Study dari perusahaan mitra.',
  path: PATHS.cases,
});

export default function CasesPage() {
  return (
    <Suspense fallback={<CardGridSkeleton />}>
      <CatalogView />
    </Suspense>
  );
}
