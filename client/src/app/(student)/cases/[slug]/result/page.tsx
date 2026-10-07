import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { ResultView } from './_components/ResultView';

export async function generateMetadata({ params }: PageProps<'/cases/[slug]/result'>) {
  const { slug } = await params;
  return createPageMetadata({
    title: 'Hasil Penilaian',
    description: 'Skor total, skor dan alasan per kriteria, feedback, dan sertifikat.',
    path: PATHS.caseResult(decodeURIComponent(slug)),
    noIndex: true,
  });
}

export default async function CaseResultPage({ params }: PageProps<'/cases/[slug]/result'>) {
  const { slug } = await params;
  return <ResultView slug={decodeURIComponent(slug)} />;
}
