'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { PATHS } from '@/constants/paths';
import { handleApiError } from '@/lib/apiError';
import { resultService } from '@/services/result';
import { learningKeys } from './useLearning';
import { profileKeys } from './useProfile';

export function useCaseResult(slug: string) {
  return useQuery({
    queryKey: learningKeys.result(slug),
    queryFn: () => resultService.get(slug),
  });
}

export function useShareConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resultService.setShareConsent,
    onSuccess: async (consent) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: learningKeys.all }),
        queryClient.invalidateQueries({ queryKey: profileKeys.all }),
      ]);
      if (consent === 'granted') {
        toast.success('Profil dibagikan ke mitra', {
          description: 'Tim rekrutmen mitra akan menghubungimu lewat email bila ada kecocokan.',
        });
      } else {
        toast.success('Pilihanmu tersimpan', {
          description: 'Profilmu tidak dibagikan. Kamu bisa mengubahnya kapan saja.',
        });
      }
    },
    onError: (error) => handleApiError(error, 'Persetujuan gagal disimpan. Coba lagi.'),
  });
}

/** Belum lulus → kerjakan lagi, lalu buka halaman pengerjaan. */
export function useRetryCase(slug: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: resultService.retry,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: learningKeys.all });
      toast.success('Case dibuka kembali', {
        description: 'Isian sebelumnya sudah terisi. Perbaiki lalu kirim ulang.',
      });
      router.push(PATHS.caseWork(slug));
    },
    onError: (error) => handleApiError(error, 'Gagal membuka kembali case. Coba lagi.'),
  });
}
