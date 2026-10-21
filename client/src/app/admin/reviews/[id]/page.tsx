import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { ReviewDetailView } from './_components/ReviewDetailView';

export async function generateMetadata({ params }: PageProps<'/admin/reviews/[id]'>) {
  const { id } = await params;
  return createPageMetadata({
    title: 'Detail Penilaian',
    description: 'Submission peserta, hasil penilaian, dan aksi admin.',
    path: PATHS.adminReview(decodeURIComponent(id)),
    noIndex: true,
  });
}

export default async function AdminReviewDetailPage({ params }: PageProps<'/admin/reviews/[id]'>) {
  const { id } = await params;
  return <ReviewDetailView id={decodeURIComponent(id)} />;
}
