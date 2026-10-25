'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { handleApiError } from '@/lib/apiError';
import { adminService } from '@/services/admin';
import type { IAdminFlagPayload, IAdminReviewDetail } from '@/types';
import { adminKeys } from './useAdmin';

/** Penilaian AI tiruan selesai dalam hitungan detik; periksa ulang selama masih berjalan. */
const AI_GRADING_POLL_MS = 3000;

export function useAdminReviews() {
  return useQuery({ queryKey: adminKeys.reviews(), queryFn: adminService.listReviews });
}

export function useAdminReview(id: string) {
  return useQuery({
    queryKey: adminKeys.review(id),
    queryFn: () => adminService.getReview(id),
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.item.status === 'ai_grading' ? AI_GRADING_POLL_MS : false,
  });
}

/**
 * Aksi admin di detail penilaian. Setiap aksi mengembalikan detail terbaru, lalu daftar,
 * ringkasan Dashboard, dan badge sidebar ikut diperbarui.
 */
export function useAdminReviewActions(id: string) {
  const queryClient = useQueryClient();
  const handleSuccess = (detail: IAdminReviewDetail, message: string, description?: string) => {
    queryClient.setQueryData(adminKeys.review(id), detail);
    queryClient.invalidateQueries({ queryKey: adminKeys.reviews() });
    queryClient.invalidateQueries({ queryKey: adminKeys.overview() });
    toast.success(message, { description });
  };

  const regrade = useMutation({
    mutationFn: () => adminService.regrade(id),
    onSuccess: (detail) =>
      handleSuccess(detail, 'Penilaian ulang dimulai', 'Hasil baru keluar dalam beberapa detik.'),
    onError: (error) => handleApiError(error, 'Penilaian ulang gagal dimulai. Coba lagi.'),
  });

  const setFlag = useMutation({
    mutationFn: (payload: IAdminFlagPayload) => adminService.setFlag({ id, payload }),
    onSuccess: (detail, payload) =>
      handleSuccess(detail, payload.isFlagged ? 'Ditandai bermasalah' : 'Tanda dilepas'),
    onError: (error) => handleApiError(error, 'Tanda gagal disimpan. Coba lagi.'),
  });

  const remind = useMutation({
    mutationFn: () => adminService.remindReviewer(id),
    onSuccess: (detail) =>
      handleSuccess(
        detail,
        'Pengingat terkirim',
        detail.item.reviewerName ? `Dikirim ke ${detail.item.reviewerName}.` : undefined
      ),
    onError: (error) => handleApiError(error, 'Pengingat gagal dikirim. Coba lagi.'),
  });

  return { regrade, setFlag, remind };
}
