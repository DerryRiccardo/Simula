'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { PATHS } from '@/constants/paths';
import { handleApiError } from '@/lib/apiError';
import { adminService } from '@/services/admin';
import type { IAdminCaseSavePayload } from '@/types';

export const adminKeys = {
  all: ['admin'] as const,
  overview: () => [...adminKeys.all, 'overview'] as const,
  reviews: () => [...adminKeys.all, 'reviews'] as const,
  review: (id: string) => [...adminKeys.all, 'review', id] as const,
  partners: () => [...adminKeys.all, 'partners'] as const,
  members: () => [...adminKeys.all, 'members'] as const,
  member: (id: string) => [...adminKeys.all, 'member', id] as const,
  orders: () => [...adminKeys.all, 'orders'] as const,
  talentPool: () => [...adminKeys.all, 'talent-pool'] as const,
  fields: () => [...adminKeys.all, 'fields'] as const,
  settings: () => [...adminKeys.all, 'settings'] as const,
  cases: () => [...adminKeys.all, 'cases'] as const,
  case: (id: string) => [...adminKeys.all, 'case', id] as const,
};

export function useAdminOverview() {
  return useQuery({ queryKey: adminKeys.overview(), queryFn: adminService.getOverview });
}

export function useAdminMembers() {
  return useQuery({ queryKey: adminKeys.members(), queryFn: adminService.listMembers });
}

export function useAdminMember(id: string) {
  return useQuery({
    queryKey: adminKeys.member(id),
    queryFn: () => adminService.getMember(id),
    retry: false,
  });
}

export function useAdminOrders() {
  return useQuery({ queryKey: adminKeys.orders(), queryFn: adminService.listOrders });
}

export function useAdminCases() {
  return useQuery({ queryKey: adminKeys.cases(), queryFn: adminService.listCases });
}

export function useAdminCase(id: string | null) {
  return useQuery({
    queryKey: adminKeys.case(id ?? 'new'),
    queryFn: () => (id ? adminService.getCase(id) : null),
    enabled: id !== null,
    // Form panjang; jangan timpa isian saat tab kembali fokus.
    refetchOnWindowFocus: false,
  });
}

interface ISaveAdminCaseVariables {
  id: string | null;
  payload: IAdminCaseSavePayload;
  /** true = case sudah terbit sebelumnya, jadi ini hanya menyimpan perubahan. */
  wasPublished: boolean;
}

/** Simpan draft atau terbitkan. Toast error di sini; error per field dipetakan di form. */
export function useSaveAdminCase() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: ({ id, payload }: ISaveAdminCaseVariables) =>
      adminService.saveCase({ id, payload }),
    onSuccess: async (saved, { id, payload, wasPublished }) => {
      await queryClient.invalidateQueries({ queryKey: adminKeys.all });
      const title = wasPublished
        ? 'Perubahan tersimpan'
        : payload.isPublish
          ? 'Case diterbitkan'
          : 'Draft tersimpan';
      toast.success(title, { description: saved.title });
      if (payload.isPublish) router.push(PATHS.adminCases);
      else if (!id) router.replace(PATHS.adminCaseEdit(saved.id));
    },
    onError: (error) => handleApiError(error, 'Case gagal disimpan. Coba lagi.'),
  });
}
