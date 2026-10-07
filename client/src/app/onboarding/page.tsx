import { Suspense } from 'react';

import { Container } from '@/components/layout';
import { PageLoader, RequireAuth } from '@/components/routing';
import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { OnboardingGate } from './_components/OnboardingGate';
import { OnboardingHeader } from './_components/OnboardingHeader';
import { OnboardingWizard } from './_components/OnboardingWizard';

export const metadata = createPageMetadata({
  title: 'Lengkapi Profil',
  path: PATHS.onboarding,
  noIndex: true,
});

export default function OnboardingPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <RequireAuth roles={['student']} requireOnboarded={false}>
        <OnboardingGate>
          <div className="relative isolate flex min-h-dvh flex-1 flex-col overflow-hidden">
            <div
              className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-grid mask-fade-radial opacity-60"
              aria-hidden="true"
            />
            <div
              className="absolute -top-56 left-1/2 -z-10 size-[36rem] -translate-x-1/2 rounded-full bg-brand-soft blur-3xl"
              aria-hidden="true"
            />
            <OnboardingHeader />
            <main className="flex-1 py-12 lg:py-16">
              <Container>
                <OnboardingWizard />
              </Container>
            </main>
          </div>
        </OnboardingGate>
      </RequireAuth>
    </Suspense>
  );
}
