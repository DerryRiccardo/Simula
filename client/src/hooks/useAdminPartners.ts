'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { handleApiError } from '@/lib/apiError';
import { adminService } from '@/services/admin';
import type { IAdminPartnerDirectory, IAdminReassignPayload, IAdminReviewer } from '@/types';
import { adminKeys } from './useAdmin';

export function usePartnerDirectory() {
  return useQuery({ queryKey: adminKeys.partners(), queryFn: adminService.getPartnerDirectory });
}

/**
 * Perubahan mitra atau reviewer ikut mengubah daftar Penilaian (nama reviewer, antrean),
 * jadi semua data panel admin diperbarui.
 */
function useInvalidateAdmin() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: adminKeys.all });
}

/** Error per field dipetakan di form (onError di pemanggil); toast di sini untuk sisanya. */
export function useSavePartner() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: adminService.savePartner,
    onSuccess: (partner, { id }) => {
      invalidate();
      toast.success(id ? 'Mitra diperbarui' : 'Mitra ditambahkan', { description: partner.name });
    },
    onError: (error) => handleApiError(error, 'Mitra gagal disimpan. Coba lagi.'),
  });
}

export function useCreateReviewer() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: adminService.createReviewer,
    onSuccess: (reviewer) => {
      invalidate();
      toast.success('Reviewer ditambahkan', {
        description: `Undangan untuk mengatur password dikirim ke ${reviewer.email}.`,
      });
    },
    onError: (error) => handleApiError(error, 'Reviewer gagal ditambahkan. Coba lagi.'),
  });
}

interface IToggleCaseVariables {
  reviewer: IAdminReviewer;
  caseId: string;
  caseTitle: string;
  /** true = tugaskan, false = lepas. */
  isAssigned: boolean;
}

/**
 * Tugaskan atau lepas satu case dari halaman penugasan reviewer. Optimistic: tombol langsung
 * berubah, lalu dikembalikan bila server menolak (mis. masih ada antrean di case itu).
 */
export function useToggleReviewerCase() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: ({ reviewer, caseId, isAssigned }: IToggleCaseVariables) =>
      adminService.setReviewerCases({
        id: reviewer.id,
        payload: {
          caseIds: isAssigned
            ? [...reviewer.caseIds, caseId]
            : reviewer.caseIds.filter((id) => id !== caseId),
        },
      }),
    onMutate: async ({ reviewer, caseId, isAssigned }) => {
      await queryClient.cancelQueries({ queryKey: adminKeys.partners() });
      const previous = queryClient.getQueryData<IAdminPartnerDirectory>(adminKeys.partners());
      queryClient.setQueryData<IAdminPartnerDirectory>(
        adminKeys.partners(),
        (current) =>
          current && {
            ...current,
            reviewers: current.reviewers.map((item) =>
              item.id !== reviewer.id
                ? item
                : {
                    ...item,
                    caseIds: isAssigned
                      ? [...item.caseIds, caseId]
                      : item.caseIds.filter((id) => id !== caseId),
                  }
            ),
          }
      );
      return { previous };
    },
    onSuccess: (reviewer, { caseTitle, isAssigned }) =>
      toast.success(isAssigned ? 'Case ditugaskan' : 'Penugasan dilepas', {
        description: `${caseTitle} ${isAssigned ? 'kini dinilai' : 'tidak lagi dinilai'} ${reviewer.name}.`,
      }),
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(adminKeys.partners(), context.previous);
      handleApiError(error, 'Penugasan gagal disimpan. Coba lagi.');
    },
    onSettled: () => invalidate(),
  });
}

export function useSetReviewerStatus() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: adminService.setReviewerStatus,
    onSuccess: (reviewer) => {
      invalidate();
      toast.success(reviewer.isActive ? 'Reviewer diaktifkan' : 'Reviewer dinonaktifkan', {
        description: reviewer.name,
      });
    },
    onError: (error) => handleApiError(error, 'Status reviewer gagal diubah. Coba lagi.'),
  });
}

/** Detail penilaian: pindahkan submission B2B ke reviewer lain. */
export function useReassignReviewer(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: IAdminReassignPayload) => adminService.reassignReviewer({ id, payload }),
    onSuccess: (detail) => {
      queryClient.setQueryData(adminKeys.review(id), detail);
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
      toast.success('Reviewer diganti', {
        description: detail.item.reviewerName
          ? `Submission kini di antrean ${detail.item.reviewerName}.`
          : undefined,
      });
    },
    onError: (error) => handleApiError(error, 'Reviewer gagal diganti. Coba lagi.'),
  });
}
