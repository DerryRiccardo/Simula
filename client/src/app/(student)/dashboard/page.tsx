import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { DashboardView } from './_components/DashboardView';

export const metadata = createPageMetadata({
  title: 'Dashboard',
  path: PATHS.dashboard,
  noIndex: true,
});

export default function DashboardPage() {
  return <DashboardView />;
}
