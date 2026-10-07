'use client';

import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { PATHS } from '@/constants/paths';
import { handleApiError } from '@/lib/apiError';
import { reviewStatusService } from '@/services/reviewStatus';
import type { TEnrollmentStatus } from '@/types';
import { learningKeys } from './useLearning';

/** Selama AI menilai, status diperiksa ulang berkala sampai hasilnya keluar. */
const AI_GRADING_POLL_MS = 1500;

export function useCaseStatus(slug: string) {
  return useQuery({
    queryKey: learningKeys.status(slug),
    queryFn: () => reviewStatusService.get(slug),
    refetchInterval: (query) =>
      query.state.data?.enrollment?.status === 'ai_grading' ? AI_GRADING_POLL_MS : false,
  });
}

/**
 * Penilaian AI selesai saat halaman status terbuka → beri tahu, lalu pindah otomatis ke hasil.
 * Hanya bereaksi pada perpindahan dari ai_grading, bukan saat membuka halaman yang sudah dinilai.
 */
export function useAiGradingCompletion(slug: string, status: TEnrollmentStatus | undefined) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const wasGrading = useRef(false);

  useEffect(() => {
    if (status === 'ai_grading') {
      wasGrading.current = true;
      return;
    }
    if (!wasGrading.current || (status !== 'passed' && status !== 'failed')) return;
    wasGrading.current = false;
    void queryClient.invalidateQueries({ queryKey: learningKeys.all });
    if (status === 'passed') {
      toast.success('Penilaian AI selesai', {
        description: 'Kamu lulus. Sertifikat sudah terbit di Sertifikat Saya.',
      });
    } else {
      toast.info('Penilaian AI selesai', {
        description: 'Skormu belum mencapai ambang lulus. Feedback lengkap sudah tersedia.',
      });
    }
    router.replace(PATHS.caseResult(slug));
  }, [status, slug, queryClient, router]);
}

/** Prototype: keputusan reviewer tiruan, atau mempercepat penilaian AI. Revisi → halaman pengerjaan; dinilai → halaman hasil. */
export function useSimulateReview(slug: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: reviewStatusService.simulate,
    onSuccess: async (enrollment, { outcome }) => {
      await queryClient.invalidateQueries({ queryKey: learningKeys.all });
      // AI case: toast dan pindah halaman ditangani useAiGradingCompletion.
      if (enrollment.caseSummary.tier === 'ai') return;
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
