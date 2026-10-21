import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { SettingsView } from './_components/SettingsView';

export const metadata = createPageMetadata({
  title: 'Pengaturan',
  description: 'Nilai bawaan platform: SLA review, batas revisi, ambang lulus, dan pembayaran.',
  path: PATHS.adminSettings,
  noIndex: true,
});

export default function AdminSettingsPage() {
  return <SettingsView />;
}
