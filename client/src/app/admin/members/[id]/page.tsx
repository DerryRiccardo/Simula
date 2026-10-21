import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { MemberDetailView } from './_components/MemberDetailView';

export async function generateMetadata({ params }: PageProps<'/admin/members/[id]'>) {
  const { id } = await params;
  return createPageMetadata({
    title: 'Detail Member',
    description: 'Profil, riwayat case, order, dan sertifikat member.',
    path: PATHS.adminMember(decodeURIComponent(id)),
    noIndex: true,
  });
}

export default async function AdminMemberDetailPage({ params }: PageProps<'/admin/members/[id]'>) {
  const { id } = await params;
  return <MemberDetailView id={decodeURIComponent(id)} />;
}
