import { Suspense } from 'react';

import { PageLoader } from '@/components/routing';
import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { MembersView } from './_components/MembersView';

export const metadata = createPageMetadata({
  title: 'Member',
  description: 'Mahasiswa terdaftar beserta aktivitas case, sertifikat, dan pembeliannya.',
  path: PATHS.adminMembers,
  noIndex: true,
});

export default function AdminMembersPage() {
  return (
    // useSearchParams (filter di URL) butuh Suspense agar halaman tetap bisa di-prerender.
    <Suspense fallback={<PageLoader />}>
      <MembersView />
    </Suspense>
  );
}
