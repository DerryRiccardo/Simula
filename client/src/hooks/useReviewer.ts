'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { PATHS } from '@/constants/paths';
import { handleApiError } from '@/lib/apiError';
import { reviewerService } from '@/services/reviewer';
import type { TReviewDraftPayload } from '@/types';
import { useDebounce } from './useDebounce';
import { learningKeys } from './useLearning';

const AUTOSAVE_DELAY_MS = 1200;

export const reviewerKeys = {
  all: ['reviewer'] as const,
  queue: () => [...reviewerKeys.all, 'queue'] as const,
  submission: (id: string) => [...reviewerKeys.all, 'submission', id] as const,
};

export function useReviewerQueue() {
  return useQuery({ queryKey: reviewerKeys.queue(), queryFn: reviewerService.getQueue });
}

export function useReviewSubmission(id: string) {
  return useQuery({
    queryKey: reviewerKeys.submission(id),
    queryFn: () => reviewerService.getSubmission(id),
    // Form penilaian panjang; jangan timpa isian saat tab kembali fokus.
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/**
 * Simpan draft penilaian. Sengaja tanpa invalidate: data submission tidak berubah, dan refetch
 * akan menimpa isian form yang sedang diketik.
 */
export function useSaveReviewDraft() {
  return useMutation({
    mutationFn: reviewerService.saveDraft,
    onError: (error) => handleApiError(error, 'Draft penilaian gagal disimpan. Periksa koneksimu.'),
  });
}

interface IAutosaveOptions<T> {
  id: string;
  /** Bagian draft yang dimiliki form ini. */
  part: 'grade' | 'revision';
  values: T;
  initialSavedAt: string | null;
  /** false setelah keputusan dikirim, agar draft tidak dibuat ulang. */
  isEnabled: boolean;
}

/**
 * Simpan otomatis isian form penilaian setelah berhenti mengetik, hanya bila berbeda dari versi
 * terakhir yang tersimpan. Juga memasang peringatan saat menutup tab sebelum tersimpan.
 */
export function useReviewDraftAutosave<T>({
  id,
  part,
  values,
  initialSavedAt,
  isEnabled,
}: IAutosaveOptions<T>) {
  const saveDraft = useSaveReviewDraft();
  const snapshot = JSON.stringify(values);
  const debouncedSnapshot = useDebounce(snapshot, AUTOSAVE_DELAY_MS);
  const [lastSaved, setLastSaved] = useState(snapshot);
  const [savedAt, setSavedAt] = useState(initialSavedAt);
  const hasUnsavedChanges = isEnabled && snapshot !== lastSaved;

  useEffect(() => {
    if (!isEnabled || debouncedSnapshot === lastSaved || saveDraft.isPending) return;
    const payload: TReviewDraftPayload = { [part]: JSON.parse(debouncedSnapshot) };
    saveDraft.mutate(
      { id, payload },
      {
        onSuccess: (draft) => {
          setLastSaved(debouncedSnapshot);
          setSavedAt(draft.savedAt);
        },
      }
    );
    // Cukup dipicu oleh perubahan isian yang sudah di-debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSnapshot, isEnabled]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsavedChanges]);

  return { savedAt, isSaving: saveDraft.isPending, hasUnsavedChanges };
}

/** Keputusan reviewer mengubah data mahasiswa juga (status, hasil, sertifikat). */
function useDecisionSuccess() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return async (title: string, description: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: reviewerKeys.all }),
      queryClient.invalidateQueries({ queryKey: learningKeys.all }),
    ]);
    toast.success(title, { description });
    router.push(PATHS.reviewer);
  };
}

// Toast error ditangani di sini; pemetaan error per field ke form ada di komponen pemanggil.
export function useGradeSubmission() {
  const onDecided = useDecisionSuccess();
  return useMutation({
    mutationFn: reviewerService.grade,
    onSuccess: (item) =>
      onDecided(
        'Review terkirim',
        `${item.candidateLabel} mendapat skor ${item.score ?? '-'} dan langsung melihat hasilnya.`
      ),
    onError: (error) => handleApiError(error, 'Review gagal dikirim. Coba lagi.'),
  });
}

export function useRequestRevision() {
  const onDecided = useDecisionSuccess();
  return useMutation({
    mutationFn: reviewerService.requestRevision,
    onSuccess: (item) =>
      onDecided(
        'Submission dikembalikan',
        `${item.candidateLabel} mendapat tambahan 3 hari untuk memperbaikinya.`
      ),
    onError: (error) => handleApiError(error, 'Gagal mengembalikan submission. Coba lagi.'),
  });
}
