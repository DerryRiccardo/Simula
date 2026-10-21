import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { FieldsView } from './_components/FieldsView';

export const metadata = createPageMetadata({
  title: 'Bidang studi',
  description: 'Data master bidang studi untuk onboarding, filter katalog, dan pembuat case.',
  path: PATHS.adminFields,
  noIndex: true,
});

export default function AdminFieldsPage() {
  return <FieldsView />;
}
