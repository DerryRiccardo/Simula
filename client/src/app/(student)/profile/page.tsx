import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { ProfileView } from './_components/ProfileView';

export const metadata = createPageMetadata({
  title: 'Profil',
  description: 'Data diri, bidang, pengaturan notifikasi, dan persetujuan berbagi data.',
  path: PATHS.profile,
  noIndex: true,
});

export default function ProfilePage() {
  return <ProfileView />;
}
