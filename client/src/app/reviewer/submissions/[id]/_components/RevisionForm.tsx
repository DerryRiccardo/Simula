'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch, type FieldPath } from 'react-hook-form';
import { Info, RotateCcw } from 'lucide-react';

import { ConfirmDialog } from '@/components';
import { TextareaField } from '@/components/forms';
import { Button } from '@/components/ui';
import { REVISION_REASONS } from '@/constants/review';
import { useRequestRevision, useReviewDraftAutosave } from '@/hooks/useReviewer';
import { getApiFieldErrors } from '@/lib/apiError';
import { cn } from '@/lib/utils';
import type { IReviewSubmissionDetail } from '@/types';
import {
  getRevisionDefaults,
  MIN_REASON_LENGTH,
  revisionSchema,
  type TRevisionFormValues,
} from '../_schema';
import { DraftStatus } from './DraftStatus';

interface ReasonPickerProps {
  value: string;
  onChange: (reason: string) => void;
  error?: string;
}

// Radio native yang disembunyikan, sama seperti pemilih level di form "Nilai".
function ReasonPicker({ value, onChange, error }: ReasonPickerProps) {
  return (
    <fieldset className="grid gap-2" aria-invalid={error ? true : undefined}>
      <legend className="mb-1.5 text-sm font-medium text-ink">Alasan</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {REVISION_REASONS.map((reason) => (
          <label key={reason} className="relative">
            <input
              type="radio"
              name="revision-reason"
              value={reason}
              checked={value === reason}
              onChange={() => onChange(reason)}
              className="peer sr-only"
            />
            <span
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-control border px-3.5 py-3 text-sm transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-brand/30',
                value === reason
                  ? 'border-brand bg-brand-soft/60 font-medium text-ink'
                  : 'border-line text-ink-muted hover:border-ink/25 hover:text-ink'
              )}
            >
              <span
                className={cn(
                  'grid size-4 shrink-0 place-items-center rounded-full border',
                  value === reason ? 'border-brand' : 'border-ink/25'
                )}
                aria-hidden="true"
              >
                {value === reason && <span className="size-2 rounded-full bg-brand" />}
              </span>
              {reason}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

// "Kembalikan untuk revisi" (CONTEXT.md 4.8): submission belum dinilai, jadi skor tidak berkurang.
export function RevisionForm({ detail }: { detail: IReviewSubmissionDetail }) {
  const { item, maxRevisions } = detail;
  const remaining = maxRevisions - item.revisionCount;
  const form = useForm<TRevisionFormValues>({
    resolver: zodResolver(revisionSchema),
    defaultValues: getRevisionDefaults(detail.draft?.revision ?? null),
  });
  const { control, handleSubmit, setError } = form;
  const requestRevision = useRequestRevision();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const autosave = useReviewDraftAutosave({
    id: item.id,
    part: 'revision',
    values: useWatch({ control }),
    initialSavedAt: detail.draft?.revision ? detail.draft.savedAt : null,
    isEnabled: !requestRevision.isPending && !requestRevision.isSuccess,
  });

  const handleConfirm = () =>
    requestRevision.mutate(
      { id: item.id, payload: form.getValues() },
      {
        onError: (error) => {
          setIsConfirmOpen(false);
          getApiFieldErrors(error).forEach(({ field, message }) =>
            setError(field as FieldPath<TRevisionFormValues>, { message })
          );
        },
      }
    );

  return (
    <form onSubmit={handleSubmit(() => setIsConfirmOpen(true))} noValidate className="grid gap-6">
      <p className="flex gap-2.5 rounded-card border border-line bg-surface-soft/60 p-4 text-sm leading-relaxed text-ink-muted">
        <Info className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
        <span>
          Pakai ini bila deliverable belum lengkap, tidak sesuai brief, atau tautan dan berkas tidak
          bisa dibuka. Submission belum dinilai, skor kandidat tidak berkurang, dan tenggatnya
          bertambah 3 hari. Sisa kesempatan revisi:{' '}
          <span className="font-mono font-medium text-ink tabular-nums">
            {remaining} dari {maxRevisions}
          </span>
          .
        </span>
      </p>

      <Controller
        control={control}
        name="reason"
        render={({ field, fieldState }) => (
          <ReasonPicker
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="note"
        render={({ field, fieldState }) => (
          <TextareaField
            id="revision-note"
            label="Catatan untuk kandidat"
            rows={4}
            hint={`Wajib, minimal ${MIN_REASON_LENGTH} karakter. Sebutkan deliverable mana yang perlu diperbaiki.`}
            error={fieldState.error?.message}
            placeholder="Contoh: tautan repositori meminta izin akses. Ubah menjadi publik, lalu kirim ulang."
            {...field}
          />
        )}
      />

      <div className="flex flex-wrap items-center justify-end gap-4">
        <DraftStatus isSaving={autosave.isSaving} savedAt={autosave.savedAt} />
        <Button type="submit" size="pill" disabled={requestRevision.isPending}>
          <RotateCcw className="size-4" />
          Kembalikan untuk revisi
        </Button>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={`Kembalikan submission ${item.candidateLabel}?`}
        description="Status kandidat berubah menjadi Perlu revisi dengan catatanmu, dan tenggat bertambah 3 hari. Submission ulang akan kembali ke antreanmu."
        confirmLabel="Ya, kembalikan"
        onConfirm={handleConfirm}
        isPending={requestRevision.isPending}
      />
    </form>
  );
}
