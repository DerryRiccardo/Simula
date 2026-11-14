import { Suspense } from 'react';

import { AuthFlowHeader, Container } from '@/components/layout';
import { PageLoader, RequireAuth } from '@/components/routing';
import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { ChangePasswordForm } from './_components/ChangePasswordForm';

export const metadata = createPageMetadata({
  title: 'Ganti Kata Sandi',
  path: PATHS.changePassword,
  noIndex: true,
});

// Akun yang dibuat admin (reviewer) memakai kata sandi sementara; halaman ini wajib dilewati dulu.
export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <RequireAuth requireOnboarded={false} requirePasswordChanged={false}>
        <div className="relative isolate flex min-h-dvh flex-1 flex-col overflow-hidden">
          <div
            className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-grid mask-fade-radial opacity-60"
            aria-hidden="true"
          />
          <AuthFlowHeader />
          <main className="flex-1 py-12 lg:py-16">
            <Container className="max-w-md">
              <ChangePasswordForm />
            </Container>
          </main>
        </div>
      </RequireAuth>
    </Suspense>
  );
}
