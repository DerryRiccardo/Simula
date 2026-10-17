import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { CaseBuilderView } from '../_components/CaseBuilderView';

export const metadata = createPageMetadata({
  title: 'Buat Case',
  path: PATHS.adminCaseNew,
  noIndex: true,
});

export default function AdminCaseNewPage() {
  return <CaseBuilderView id={null} />;
}
