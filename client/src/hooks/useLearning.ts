'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { PATHS } from '@/constants/paths';
import { handleApiError } from '@/lib/apiError';
import { caseService, studentService } from '@/services/learning';
import type { ICaseListParams, IEnrollmentListParams, TTier } from '@/types';

export const learningKeys = {
  all: ['learning'] as const,
  dashboard: () => [...learningKeys.all, 'dashboard'] as const,
  cases: (params?: ICaseListParams) => [...learningKeys.all, 'cases', params] as const,
  caseDetail: (slug: string) => [...learningKeys.all, 'case', slug] as const,
  workspace: (slug: string) => [...learningKeys.all, 'workspace', slug] as const,
  checkout: (slug: string) => [...learningKeys.all, 'checkout', slug] as const,
  status: (slug: string) => [...learningKeys.all, 'status', slug] as const,
  result: (slug: string) => [...learningKeys.all, 'result', slug] as const,
  certificate: (id: string) => [...learningKeys.all, 'certificate', id] as const,
  enrollments: (params?: IEnrollmentListParams) =>
    [...learningKeys.all, 'enrollments', params] as const,
  certificates: (params?: { tier?: TTier }) =>
    [...learningKeys.all, 'certificates', params] as const,
};

export function useDashboardSummary() {
  return useQuery({ queryKey: learningKeys.dashboard(), queryFn: studentService.getDashboard });
}

export function useCaseCatalog(params: ICaseListParams) {
  return useQuery({
    queryKey: learningKeys.cases(params),
    queryFn: () => caseService.getAll(params),
    // Hasil lama tetap tampil saat filter berganti, agar grid tidak berkedip.
    placeholderData: keepPreviousData,
  });
}

export function useCaseDetail(slug: string) {
  return useQuery({
    queryKey: learningKeys.caseDetail(slug),
    queryFn: () => caseService.getBySlug(slug),
  });
}

/** Mulai AI case gratis, lalu langsung ke halaman pengerjaan. */
export function useStartCase() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: studentService.startCase,
    onSuccess: async (enrollment) => {
      await queryClient.invalidateQueries({ queryKey: learningKeys.all });
      toast.success('Case ditambahkan ke Case Saya', {
        description: enrollment.caseSummary.title,
      });
      router.push(PATHS.caseWork(enrollment.caseSummary.slug));
    },
    onError: (error) => handleApiError(error, 'Gagal memulai case. Coba lagi.'),
  });
}

export function useMyEnrollments(params: IEnrollmentListParams) {
  return useQuery({
    queryKey: learningKeys.enrollments(params),
    queryFn: () => studentService.getEnrollments(params),
    placeholderData: keepPreviousData,
  });
}

export function useMyCertificates(params: { tier?: TTier }) {
  return useQuery({
    queryKey: learningKeys.certificates(params),
    queryFn: () => studentService.getCertificates(params),
    placeholderData: keepPreviousData,
  });
}
