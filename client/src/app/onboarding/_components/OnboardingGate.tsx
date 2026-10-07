'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { PageLoader } from '@/components/routing';
import { useCurrentUser } from '@/hooks/useAuth';
import { getPostAuthPath } from '@/lib/authRedirect';

// Onboarding hanya sekali: pengguna yang sudah melengkapi profil langsung diteruskan.
export function OnboardingGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const next = useSearchParams().get('next');
  const { user } = useCurrentUser();
  const redirectPath = user?.isOnboarded ? getPostAuthPath(user, next) : null;

  useEffect(() => {
    if (redirectPath) router.replace(redirectPath);
  }, [redirectPath, router]);

  if (redirectPath) return <PageLoader />;
  return <>{children}</>;
}
