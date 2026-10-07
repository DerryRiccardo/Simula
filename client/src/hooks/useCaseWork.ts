'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { handleApiError } from '@/lib/apiError';
import { workspaceService } from '@/services/workspace';
import { learningKeys } from './useLearning';

export function useCaseWorkspace(slug: string) {
  return useQuery({
    queryKey: learningKeys.workspace(slug),
    queryFn: () => workspaceService.get(slug),
    // Draft disimpan otomatis; jangan timpa isian form dengan refetch saat tab kembali fokus.
    refetchOnWindowFocus: false,
  });
}

/** B2B: mulai mengerjakan, tenggat dihitung sejak saat ini. */
export function useStartWork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workspaceService.start,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: learningKeys.all });
      toast.success('Case dimulai', { description: 'Tenggat pengerjaan mulai dihitung.' });
    },
    onError: (error) => handleApiError(error, 'Gagal memulai case. Coba lagi.'),
  });
}

/** Simpan draft. Toast hanya untuk simpan manual; simpan otomatis cukup indikator di header. */
export function useSaveDraft() {
  return useMutation({
    mutationFn: workspaceService.saveDraft,
    onError: (error) => handleApiError(error, 'Draft gagal disimpan. Periksa koneksimu.'),
  });
}

export function useSubmitWork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workspaceService.submit,
    onSuccess: async (enrollment) => {
      await queryClient.invalidateQueries({ queryKey: learningKeys.all });
      toast.success('Submission terkirim', {
        description:
          enrollment.status === 'in_review'
            ? 'Reviewer mitra akan menilai hasil kerjamu.'
            : 'AI sedang menilai hasil kerjamu.',
      });
    },
    onError: (error) => handleApiError(error, 'Submission gagal dikirim. Coba lagi.'),
  });
}
