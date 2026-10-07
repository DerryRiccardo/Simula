'use client';

import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, CloudCheck, Loader2, Minus } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components';
import { Button, Checkbox } from '@/components/ui';
import { useSaveDraft, useSubmitWork } from '@/hooks/useCaseWork';
import { useDebounce } from '@/hooks/useDebounce';
import { formatTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ISubmissionDraft, ISubmissionRecord, ISubmissionSlot, TSlotValue } from '@/types';
import {
  NOTE_MAX_LENGTH,
  buildSubmissionSchema,
  getInitialValues,
  isSlotFilled,
  toSubmissionContent,
  type ISubmissionFormValues,
} from '../_schema';
import { SlotField } from './SlotField';

const AUTOSAVE_DELAY_MS = 1500;

interface SubmissionFormProps {
  enrollmentId: string;
  slots: ISubmissionSlot[];
  draft: ISubmissionDraft | null;
  /** Submission sebelumnya, dipakai sebagai isian awal saat revisi. */
  previousSubmission: ISubmissionRecord | null;
}

const serialize = (values: ISubmissionFormValues) => JSON.stringify(toSubmissionContent(values));

export function SubmissionForm({
  enrollmentId,
  slots,
  draft,
  previousSubmission,
}: SubmissionFormProps) {
  const schema = useMemo(() => buildSubmissionSchema(slots), [slots]);
  const initialValues = useMemo(
    () => getInitialValues(slots, draft ?? previousSubmission),
    [slots, draft, previousSubmission]
  );
  const form = useForm<ISubmissionFormValues>({
    // Skema dibangun dari slot milik case, jadi tipenya ditetapkan lewat ISubmissionFormValues.
    resolver: zodResolver(schema) as unknown as Resolver<ISubmissionFormValues>,
    defaultValues: initialValues,
    mode: 'onChange',
  });
  const { control, formState, handleSubmit, setError, clearErrors } = form;

  const saveDraft = useSaveDraft();
  const submitWork = useSubmitWork();
  const [savedAt, setSavedAt] = useState(draft?.savedAt ?? null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Simpan otomatis: hanya saat isian berubah dari versi terakhir yang tersimpan.
  const watched = useWatch({ control }) as ISubmissionFormValues;
  const snapshot = serialize(watched);
  const debouncedSnapshot = useDebounce(snapshot, AUTOSAVE_DELAY_MS);
  // Versi isian yang terakhir berhasil disimpan; dibandingkan dengan isian saat ini.
  const [lastSaved, setLastSaved] = useState(() => serialize(initialValues));
  const hasUnsavedChanges = snapshot !== lastSaved;

  const persist = (content: string, onDone?: () => void) => {
    saveDraft.mutate(
      { enrollmentId, content: JSON.parse(content) },
      {
        onSuccess: (saved) => {
          setLastSaved(content);
          setSavedAt(saved.savedAt);
          onDone?.();
        },
      }
    );
  };

  useEffect(() => {
    if (debouncedSnapshot === lastSaved || saveDraft.isPending || submitWork.isPending) return;
    persist(debouncedSnapshot);
    // persist sengaja tidak masuk dependensi: cukup dipicu oleh perubahan isian.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSnapshot]);

  // Peringatan saat menutup tab sebelum draft terakhir tersimpan (CLAUDE.md 9.2).
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsavedChanges]);

  const requiredSlots = slots.filter((slot) => slot.isRequired);
  const filledRequired = requiredSlots.filter((slot) =>
    isSlotFilled(watched.slots?.[slot.id] ?? null)
  ).length;
  const hasLinkSlot = slots.some((slot) => slot.kind === 'link');

  const handleConfirmSubmit = () => {
    const content = toSubmissionContent(form.getValues());
    submitWork.mutate({ enrollmentId, content }, { onSuccess: () => setIsConfirmOpen(false) });
  };

  const saveLabel = saveDraft.isPending
    ? 'Menyimpan draft'
    : savedAt
      ? `Draft tersimpan ${formatTime(savedAt)}`
      : 'Belum ada draft';

  return (
    <form
      noValidate
      onSubmit={handleSubmit(() => setIsConfirmOpen(true))}
      className="rounded-card border border-line bg-white"
    >
      <div className="border-b border-line p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[0.9375rem] md:text-[0.9375rem]">Submission</h2>
          <span className="font-mono text-xs text-ink-subtle tabular-nums">
            {filledRequired}/{requiredSlots.length} wajib terisi
          </span>
        </div>
        <div className="mt-3 flex gap-1" aria-hidden="true">
          {requiredSlots.map((slot, index) => (
            <span
              key={slot.id}
              className={cn(
                'h-1 flex-1 rounded-full',
                index < filledRequired ? 'bg-brand' : 'bg-line'
              )}
            />
          ))}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-subtle" aria-live="polite">
          {saveDraft.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CloudCheck className="size-3.5" />
          )}
          {saveLabel}
        </p>
      </div>

      <div className="grid gap-6 p-5">
        {slots.map((slot) => (
          <Controller
            key={slot.id}
            control={control}
            name={`slots.${slot.id}`}
            render={({ field, fieldState }) => (
              <SlotField
                slot={slot}
                value={field.value as TSlotValue}
                onChange={(value) => {
                  clearErrors(`slots.${slot.id}`);
                  field.onChange(value);
                }}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                onFileError={(message) => setError(`slots.${slot.id}`, { message })}
              />
            )}
          />
        ))}

        <Controller
          control={control}
          name="note"
          render={({ field, fieldState }) => (
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="submission-note" className="text-sm font-medium text-ink">
                  Catatan untuk reviewer
                </label>
                <span className="font-mono text-[0.6875rem] text-ink-subtle tabular-nums">
                  {field.value.length}/{NOTE_MAX_LENGTH}
                </span>
              </div>
              <textarea
                id="submission-note"
                rows={3}
                {...field}
                placeholder="Opsional. Asumsi, batasan, atau cara menjalankan hasil kerjamu."
                className="w-full resize-y rounded-control border border-line px-3 py-2.5 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-subtle hover:border-ink/25 focus:border-brand focus:ring-3 focus:ring-brand/15"
              />
              {fieldState.error && (
                <p className="text-xs text-error" role="alert">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          )}
        />
      </div>

      <div className="grid gap-3 border-t border-line p-5">
        {hasLinkSlot && (
          <Controller
            control={control}
            name="isLinkPublic"
            render={({ field, fieldState }) => (
              <div>
                <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-muted">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    aria-invalid={fieldState.error ? true : undefined}
                    className="mt-0.5"
                  />
                  Saya sudah memastikan semua tautan dapat diakses publik.
                </label>
                {fieldState.error && (
                  <p className="mt-1 pl-6.5 text-xs text-error" role="alert">
                    {fieldState.error.message}
                  </p>
                )}
              </div>
            )}
          />
        )}
        <Controller
          control={control}
          name="isOwnWork"
          render={({ field, fieldState }) => (
            <div>
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-muted">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  aria-invalid={fieldState.error ? true : undefined}
                  className="mt-0.5"
                />
                Hasil ini adalah pekerjaan saya sendiri.
              </label>
              {fieldState.error && formState.isSubmitted && (
                <p className="mt-1 pl-6.5 text-xs text-error" role="alert">
                  {fieldState.error.message}
                </p>
              )}
            </div>
          )}
        />

        <div className="mt-2 grid grid-cols-[auto_1fr] gap-2">
          <Button
            type="button"
            variant="outline"
            size="pill"
            disabled={saveDraft.isPending || !hasUnsavedChanges}
            onClick={() => persist(snapshot, () => toast.success('Draft tersimpan'))}
          >
            Simpan draft
          </Button>
          <Button
            type="submit"
            size="pill"
            disabled={!formState.isValid || submitWork.isPending}
            className="active:scale-[0.98]"
          >
            Submit
          </Button>
        </div>
        {!formState.isValid && (
          <p className="text-xs text-ink-subtle">
            Submit aktif setelah semua slot wajib valid dan pernyataan dicentang.
          </p>
        )}
        <p className="text-[0.6875rem] leading-relaxed text-ink-subtle">
          Prototype: berkas tidak benar-benar diunggah, hanya nama dan ukurannya yang disimpan.
        </p>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="Kirim submission?"
        description="Setelah dikirim, isian tidak bisa diubah sampai reviewer memberi keputusan."
        confirmLabel="Ya, kirim"
        onConfirm={handleConfirmSubmit}
        isPending={submitWork.isPending}
      >
        <ul className="mt-4 grid gap-2 rounded-control border border-line p-3.5 text-sm">
          {slots.map((slot) => {
            const isFilled = isSlotFilled(watched.slots?.[slot.id] ?? null);
            return (
              <li key={slot.id} className="flex items-center gap-2.5">
                {isFilled ? (
                  <Check className="size-4 text-brand" strokeWidth={2.25} />
                ) : (
                  <Minus className="size-4 text-ink-subtle" />
                )}
                <span className={isFilled ? 'text-ink' : 'text-ink-subtle'}>{slot.title}</span>
                {!isFilled && <span className="text-xs text-ink-subtle">(dilewati)</span>}
              </li>
            );
          })}
        </ul>
      </ConfirmDialog>
    </form>
  );
}
