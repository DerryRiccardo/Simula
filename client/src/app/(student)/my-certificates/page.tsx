import { Suspense } from 'react';

import { CardGridSkeleton } from '@/components';
import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { CertificatesView } from './_components/CertificatesView';

export const metadata = createPageMetadata({
  title: 'Sertifikat Saya',
  path: PATHS.myCertificates,
  noIndex: true,
});

export default function MyCertificatesPage() {
  return (
    <Suspense fallback={<CardGridSkeleton count={3} />}>
      <CertificatesView />
    </Suspense>
  );
}
