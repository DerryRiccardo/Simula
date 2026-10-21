import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { AdminOverviewView } from './_components/overview/AdminOverviewView';

export const metadata = createPageMetadata({
  title: 'Dashboard Admin',
  description: 'Ringkasan operasional platform: review, penilaian AI, pendapatan, dan member.',
  path: PATHS.admin,
  noIndex: true,
});

export default function AdminDashboardPage() {
  return <AdminOverviewView />;
}
