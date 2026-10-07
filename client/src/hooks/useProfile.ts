'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { handleApiError } from '@/lib/apiError';
import { profileService } from '@/services/profile';
import type { IProfile } from '@/types';
import { authKeys } from './useAuth';
import { learningKeys } from './useLearning';

export const profileKeys = {
  all: ['profile'] as const,
  detail: () => [...profileKeys.all, 'detail'] as const,
};

export function useProfile() {
  return useQuery({ queryKey: profileKeys.detail(), queryFn: profileService.get });
}

// Simpan hasil terbaru langsung ke cache, lalu sinkronkan data pengguna (nama, bidang) di sidebar.
function useSyncProfile() {
  const queryClient = useQueryClient();
  return async (profile: IProfile) => {
    queryClient.setQueryData(profileKeys.detail(), profile);
    queryClient.setQueryData(authKeys.me(), profile.user);
    await queryClient.invalidateQueries({ queryKey: learningKeys.all });
  };
}

export function useUpdateProfileDetails() {
  const sync = useSyncProfile();
  return useMutation({
    mutationFn: profileService.updateDetails,
    onSuccess: async (profile) => {
      await sync(profile);
      toast.success('Profil disimpan', {
        description: 'Rekomendasi case ikut menyesuaikan bidang pilihanmu.',
      });
    },
    onError: (error) => handleApiError(error, 'Profil gagal disimpan. Coba lagi.'),
  });
}

export function useUpdateNotifications() {
  const sync = useSyncProfile();
  return useMutation({
    mutationFn: profileService.updateNotifications,
    onSuccess: async (profile) => {
      await sync(profile);
      toast.success('Pengaturan notifikasi disimpan');
    },
    onError: (error) => handleApiError(error, 'Pengaturan notifikasi gagal disimpan.'),
  });
}

export function useUpdateShareDefault() {
  const sync = useSyncProfile();
  return useMutation({
    mutationFn: profileService.updateShareDefault,
    onSuccess: async (profile) => {
      await sync(profile);
      toast.success('Pengaturan berbagi data disimpan', {
        description: 'Berlaku untuk rekomendasi interview berikutnya.',
      });
    },
    onError: (error) => handleApiError(error, 'Pengaturan berbagi data gagal disimpan.'),
  });
}
