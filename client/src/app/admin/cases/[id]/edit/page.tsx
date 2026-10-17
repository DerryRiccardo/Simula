import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { CaseBuilderView } from '@/app/admin/cases/_components/CaseBuilderView';

export async function generateMetadata({ params }: PageProps<'/admin/cases/[id]/edit'>) {
  const { id } = await params;
  return createPageMetadata({
    title: 'Edit Case',
    path: PATHS.adminCaseEdit(decodeURIComponent(id)),
    noIndex: true,
  });
}

export default async function AdminCaseEditPage({ params }: PageProps<'/admin/cases/[id]/edit'>) {
  const { id } = await params;
  return <CaseBuilderView id={decodeURIComponent(id)} />;
}
