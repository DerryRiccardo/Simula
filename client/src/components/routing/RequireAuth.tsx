'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { PATHS } from '@/constants/paths';
import { useCurrentUser } from '@/hooks/useAuth';
import { getHomePathForRole, getIsSigningOut, withNext } from '@/lib/authRedirect';
import type { IUser, TRole } from '@/types';
import { PageLoader } from './PageLoader';

interface RequireAuthProps {
  children: ReactNode;
  roles?: TRole[];
  /** false khusus untuk halaman onboarding itu sendiri. */
  requireOnboarded?: boolean;
}

function getRedirectPath(
  user: IUser | null,
  pathname: string,
  roles: TRole[] | undefined,
  requireOnboarded: boolean
) {
  if (!user) return getIsSigningOut() ? PATHS.login : withNext(PATHS.login, pathname);
  if (roles && !roles.includes(user.role)) return getHomePathForRole(user.role);
  if (requireOnboarded && user.role === 'student' && !user.isOnboarded) {
    return withNext(PATHS.onboarding, pathname);
  }
  return null;
}

// Guard UX di sisi client. Otorisasi sebenarnya tetap wajib dicek di backend.
export function RequireAuth({ children, roles, requireOnboarded = true }: RequireAuthProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useCurrentUser();
  const redirectPath = isLoading ? null : getRedirectPath(user, pathname, roles, requireOnboarded);

  useEffect(() => {
    if (redirectPath) router.replace(redirectPath);
  }, [redirectPath, router]);

  if (isLoading || redirectPath) return <PageLoader />;
  return <>{children}</>;
}
