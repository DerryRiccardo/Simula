'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { PATHS } from '@/constants/paths';
import { handleApiError } from '@/lib/apiError';
import { reviewStatusService } from '@/services/reviewStatus';
import { learningKeys } from './useLearning';

export function useCaseStatus(slug: string) {
  return useQuery({
    queryKey: learningKeys.status(slug),
    queryFn: () => reviewStatusService.get(slug),
  });
}

/** Prototype: keputusan reviewer tiruan. Revisi → halaman pengerjaan; dinilai → halaman hasil. */
export function useSimulateReview(slug: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: reviewStatusService.simulate,
    onSuccess: async (_enrollment, { outcome }) => {
      await queryClient.invalidateQueries({ queryKey: learningKeys.all });
      if (outcome === 'revision') {
        toast.info('Submission dikembalikan untuk revisi', {
          description: 'Baca catatan reviewer, lalu kirim ulang submission-mu.',
        });
        router.push(PATHS.caseWork(slug));
        return;
      }
      toast.success('Hasil review sudah keluar', {
        description: 'Lihat skor dan feedback per kriteria dari reviewer.',
      });
      router.push(PATHS.caseResult(slug));
    },
    onError: (error) => handleApiError(error, 'Status review gagal diperbarui.'),
  });
}
