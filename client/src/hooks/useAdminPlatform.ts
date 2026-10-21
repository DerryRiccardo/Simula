'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { handleApiError } from '@/lib/apiError';
import { adminService } from '@/services/admin';
import type { IAdminField, ITalentCandidate } from '@/types';
import { adminKeys } from './useAdmin';

// --- Talent pool ---

export function useTalentPool() {
  return useQuery({ queryKey: adminKeys.talentPool(), queryFn: adminService.listTalentPool });
}

export function useShareTalent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminService.shareTalent,
    onSuccess: (candidate) => {
      queryClient.setQueryData<ITalentCandidate[]>(adminKeys.talentPool(), (current) =>
        current?.map((item) => (item.id === candidate.id ? candidate : item))
      );
      toast.success('Profil diteruskan ke mitra', {
        description: `${candidate.memberName} kini ada di daftar prioritas ${candidate.partnerName ?? 'mitra'}.`,
      });
    },
    onError: (error) => handleApiError(error, 'Profil gagal diteruskan. Coba lagi.'),
  });
}

// --- Bidang studi ---

export function useAdminFields() {
  return useQuery({ queryKey: adminKeys.fields(), queryFn: adminService.listFields });
}

/** Mutasi bidang mengembalikan daftar terbaru, jadi cache langsung diganti tanpa refetch. */
function useFieldListMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<IAdminField[]>,
  getMessage: (variables: TVariables) => string | null,
  errorMessage: string
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (fields, variables) => {
      queryClient.setQueryData(adminKeys.fields(), fields);
      const message = getMessage(variables);
      if (message) toast.success(message);
    },
    onError: (error) => handleApiError(error, errorMessage),
  });
}

export function useCreateField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminService.createField,
    onSuccess: (field) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.fields() });
      toast.success('Bidang ditambahkan', { description: field.label });
    },
    onError: (error) => handleApiError(error, 'Bidang gagal ditambahkan. Coba lagi.'),
  });
}

export const useUpdateField = () =>
  useFieldListMutation(
    adminService.updateField,
    ({ payload }) => `Bidang ${payload.label} diperbarui`,
    'Bidang gagal disimpan. Coba lagi.'
  );

export const useSetFieldActive = () =>
  useFieldListMutation(
    adminService.setFieldActive,
    ({ isActive }) => (isActive ? 'Bidang diaktifkan' : 'Bidang dinonaktifkan'),
    'Status bidang gagal diubah. Coba lagi.'
  );

/** Urutan berubah langsung terlihat di daftar; toast tidak perlu. */
export const useMoveField = () =>
  useFieldListMutation(adminService.moveField, () => null, 'Urutan gagal disimpan. Coba lagi.');

// --- Pengaturan ---

export function useAdminSettings() {
  return useQuery({ queryKey: adminKeys.settings(), queryFn: adminService.getSettings });
}

/** Error per field dipetakan di form (onError di pemanggil); toast di sini untuk sisanya. */
export function useSaveSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminService.saveSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(adminKeys.settings(), settings);
      const changeCount = settings.log[0]?.changes.length ?? 0;
      toast.success('Pengaturan disimpan', { description: `${changeCount} nilai diubah.` });
    },
    onError: (error) => handleApiError(error, 'Pengaturan gagal disimpan. Coba lagi.'),
  });
}
