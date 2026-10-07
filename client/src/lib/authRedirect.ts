import { PATHS } from '@/constants/paths';
import type { IUser, TRole } from '@/types';

const HOME_BY_ROLE: Record<TRole, string> = {
  student: PATHS.dashboard,
  reviewer: PATHS.reviewer,
  admin: PATHS.admin,
};

export const getHomePathForRole = (role: TRole) => HOME_BY_ROLE[role];

// Halaman alur masuk tidak boleh jadi tujuan "next" (mencegah putaran login/onboarding).
const AUTH_FLOW_PATHS: string[] = [PATHS.login, PATHS.register, PATHS.onboarding];

// Hanya terima path internal ("/..."), tolak URL eksternal atau protocol-relative ("//...").
export function getSafeNextPath(next: string | null | undefined) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  if (AUTH_FLOW_PATHS.includes(next.split('?')[0])) return null;
  return next;
}

// Saat pengguna sengaja keluar, guard halaman tidak perlu menyimpan "next": orang berikutnya
// yang masuk di perangkat ini tidak seharusnya dibawa ke halaman pengguna sebelumnya.
let isSigningOut = false;
export const markSigningOut = (value: boolean) => {
  isSigningOut = value;
};
export const getIsSigningOut = () => isSigningOut;

/** Tujuan setelah login/register: onboarding dulu bila belum, lalu `next` atau beranda per peran. */
export function getPostAuthPath(user: IUser, next?: string | null) {
  if (user.role === 'student' && !user.isOnboarded) {
    const safeNext = getSafeNextPath(next);
    return safeNext ? `${PATHS.onboarding}?next=${encodeURIComponent(safeNext)}` : PATHS.onboarding;
  }
  return getSafeNextPath(next) ?? getHomePathForRole(user.role);
}

export const withNext = (path: string, next: string | null | undefined) => {
  const safeNext = getSafeNextPath(next);
  return safeNext ? `${path}?next=${encodeURIComponent(safeNext)}` : path;
};
