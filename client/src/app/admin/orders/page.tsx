import { Suspense } from 'react';

import { PageLoader } from '@/components/routing';
import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { OrdersView } from './_components/OrdersView';

export const metadata = createPageMetadata({
  title: 'Order',
  description: 'Transaksi B2B Case Study dari payment gateway.',
  path: PATHS.adminOrders,
  noIndex: true,
});

export default function AdminOrdersPage() {
  return (
    // useSearchParams (filter di URL) butuh Suspense agar halaman tetap bisa di-prerender.
    <Suspense fallback={<PageLoader />}>
      <OrdersView />
    </Suspense>
  );
}
