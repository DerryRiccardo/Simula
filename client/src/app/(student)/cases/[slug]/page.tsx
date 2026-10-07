import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { CaseDetailView } from './_components/CaseDetailView';

export async function generateMetadata({ params }: PageProps<'/cases/[slug]'>) {
  const { slug } = await params;
  return createPageMetadata({
    title: 'Detail Case',
    description:
      'Ringkasan case study: yang akan dikerjakan, deliverable, cara penilaian, dan harga.',
    path: PATHS.caseDetail(decodeURIComponent(slug)),
  });
}

export default async function CaseDetailPage({ params }: PageProps<'/cases/[slug]'>) {
  const { slug } = await params;
  return <CaseDetailView slug={decodeURIComponent(slug)} />;
}
