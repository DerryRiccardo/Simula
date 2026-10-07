import { Suspense } from 'react';

import { RequireGuest } from '@/components/routing';
import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { RegisterForm } from '../_components/RegisterForm';

export const metadata = createPageMetadata({
  title: 'Daftar',
  description: 'Buat akun gratis dan mulai kerjakan AI Case Study untuk mengenali skill gap-mu.',
  path: PATHS.register,
});

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RequireGuest>
        <RegisterForm />
      </RequireGuest>
    </Suspense>
  );
}
