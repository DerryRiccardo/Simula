import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { StatusView } from './_components/StatusView';

export async function generateMetadata({ params }: PageProps<'/cases/[slug]/status'>) {
  const { slug } = await params;
  return createPageMetadata({
    title: 'Status Penilaian',
    description: 'Progres penilaian submission dan perkiraan waktu hasil review.',
    path: PATHS.caseStatus(decodeURIComponent(slug)),
    noIndex: true,
  });
}

export default async function CaseStatusPage({ params }: PageProps<'/cases/[slug]/status'>) {
  const { slug } = await params;
  return <StatusView slug={decodeURIComponent(slug)} />;
}
