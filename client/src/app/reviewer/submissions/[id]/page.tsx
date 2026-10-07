import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { ReviewView } from './_components/ReviewView';

export async function generateMetadata({ params }: PageProps<'/reviewer/submissions/[id]'>) {
  const { id } = await params;
  return createPageMetadata({
    title: 'Review Submission',
    description: 'Isi submission kandidat anonim dan form penilaian sesuai rubrik.',
    path: PATHS.reviewerSubmission(decodeURIComponent(id)),
    noIndex: true,
  });
}

export default async function ReviewSubmissionPage({
  params,
}: PageProps<'/reviewer/submissions/[id]'>) {
  const { id } = await params;
  return <ReviewView id={decodeURIComponent(id)} />;
}
