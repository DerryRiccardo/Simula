'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useCurrentUser } from '@/hooks/useAuth';
import { getPostAuthPath } from '@/lib/authRedirect';

// Halaman login/register: form langsung tampil, dan pengguna yang ternyata sudah masuk
// diarahkan ke tujuan berikutnya.
export function RequireGuest({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useCurrentUser();
  const redirectPath = user ? getPostAuthPath(user, searchParams.get('next')) : null;

  useEffect(() => {
    if (redirectPath) router.replace(redirectPath);
  }, [redirectPath, router]);

  if (redirectPath) return null;
  return <>{children}</>;
}
