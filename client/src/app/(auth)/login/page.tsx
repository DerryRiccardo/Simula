import { Suspense } from 'react';

import { RequireGuest } from '@/components/routing';
import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { LoginForm } from '../_components/LoginForm';

export const metadata = createPageMetadata({
  title: 'Masuk',
  description: 'Masuk ke akunmu untuk melanjutkan case study dan melihat hasil penilaian.',
  path: PATHS.login,
});

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <RequireGuest>
        <LoginForm />
      </RequireGuest>
    </Suspense>
  );
}
