import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { WorkView } from './_components/WorkView';

export async function generateMetadata({ params }: PageProps<'/cases/[slug]/work'>) {
  const { slug } = await params;
  return createPageMetadata({
    title: 'Pengerjaan Case',
    description: 'Brief lengkap, materi pendukung, rubrik, dan form submission.',
    path: PATHS.caseWork(decodeURIComponent(slug)),
    noIndex: true,
  });
}

export default async function CaseWorkPage({ params }: PageProps<'/cases/[slug]/work'>) {
  const { slug } = await params;
  return <WorkView slug={decodeURIComponent(slug)} />;
}
