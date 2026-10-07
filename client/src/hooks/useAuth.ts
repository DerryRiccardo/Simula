'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { PATHS } from '@/constants/paths';
import { getApiFieldErrors, handleApiError } from '@/lib/apiError';
import { getPostAuthPath, markSigningOut } from '@/lib/authRedirect';
import { authService } from '@/services/auth';
import type { IUser } from '@/types';

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
};

/** Pengguna yang sedang masuk. `user` bernilai null jika belum masuk (401). */
export function useCurrentUser() {
  const query = useQuery({
    queryKey: authKeys.me(),
    queryFn: authService.me,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const user = query.data ?? null;
  return {
    user,
    isLoading: query.isLoading,
    isAuthenticated: user !== null,
  };
}

// Toast hanya untuk error umum; error per field ditampilkan langsung di form.
function handleAuthError(error: unknown, fallback: string) {
  if (getApiFieldErrors(error).length === 0) handleApiError(error, fallback);
}

function useAuthSuccess(next: string | null | undefined) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return (user: IUser, message: string) => {
    markSigningOut(false);
    queryClient.setQueryData(authKeys.me(), user);
    toast.success(message);
    router.replace(getPostAuthPath(user, next));
  };
}

export function useLogin(next?: string | null) {
  const onAuthSuccess = useAuthSuccess(next);
  return useMutation({
    mutationFn: authService.login,
    onSuccess: (user) => onAuthSuccess(user, `Selamat datang kembali, ${user.name.split(' ')[0]}`),
    onError: (error) => handleAuthError(error, 'Gagal masuk. Coba lagi.'),
  });
}

export function useRegister(next?: string | null) {
  const onAuthSuccess = useAuthSuccess(next);
  return useMutation({
    mutationFn: authService.register,
    onSuccess: (user) => onAuthSuccess(user, 'Akun berhasil dibuat. Lengkapi profilmu dulu, ya.'),
    onError: (error) => handleAuthError(error, 'Gagal membuat akun. Coba lagi.'),
  });
}

export function useGoogleLogin(next?: string | null) {
  const onAuthSuccess = useAuthSuccess(next);
  return useMutation({
    mutationFn: authService.loginWithGoogle,
    onSuccess: (user) => onAuthSuccess(user, 'Berhasil masuk dengan Google.'),
    onError: (error) => handleApiError(error, 'Gagal masuk dengan Google.'),
  });
}

export function useCompleteOnboarding(next?: string | null) {
  const onAuthSuccess = useAuthSuccess(next);
  return useMutation({
    mutationFn: authService.completeOnboarding,
    onSuccess: (user) => onAuthSuccess(user, 'Profil tersimpan. Selamat datang.'),
    onError: (error) => handleAuthError(error, 'Gagal menyimpan profil. Coba lagi.'),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      markSigningOut(true);
      queryClient.setQueryData(authKeys.me(), null);
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== authKeys.all[0] });
      toast.success('Kamu sudah keluar.');
      router.replace(PATHS.login);
    },
    onError: (error) => handleApiError(error, 'Gagal keluar. Coba lagi.'),
  });
}
