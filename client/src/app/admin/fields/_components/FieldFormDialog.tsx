'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { FormDialog } from '@/components/admin';
import { TextField } from '@/components/forms';
import { useCreateField, useUpdateField } from '@/hooks/useAdminPlatform';
import { getApiFieldErrors } from '@/lib/apiError';
import type { IAdminField } from '@/types';

const schema = z.object({
  label: z.string().trim().min(2, 'Tulis minimal 2 karakter.'),
  description: z.string().trim().min(5, 'Tulis minimal 5 karakter.'),
});
type TFieldValues = z.infer<typeof schema>;

interface FieldFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** null = bidang baru. */
  field: IAdminField | null;
}

export function FieldFormDialog({ isOpen, onOpenChange, field }: FieldFormDialogProps) {
  const create = useCreateField();
  const update = useUpdateField();
  const isPending = create.isPending || update.isPending;
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<TFieldValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (isOpen) reset({ label: field?.label ?? '', description: field?.description ?? '' });
  }, [isOpen, field, reset]);

  const mapErrors = (error: unknown) =>
    getApiFieldErrors(error).forEach(({ field: name, message }) =>
      setError(name as keyof TFieldValues, { message })
    );

  const handleSave = handleSubmit((values) => {
    const options = { onSuccess: () => onOpenChange(false), onError: mapErrors };
    if (field) update.mutate({ key: field.key, payload: values }, options);
    else create.mutate(values, options);
  });

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={field ? 'Ubah bidang' : 'Tambah bidang'}
      description="Bidang tampil di onboarding, filter katalog, dan pembuat case. Kode bidang dibuat otomatis dan tidak berubah setelah dipakai."
      submitLabel={field ? 'Simpan' : 'Tambah bidang'}
      isPending={isPending}
      onSubmit={handleSave}
    >
      <TextField
        id="field-label"
        label="Nama bidang"
        placeholder="Contoh: Cyber Security"
        hint={field ? `Kode: ${field.key}` : undefined}
        error={errors.label?.message}
        {...register('label')}
      />
      <TextField
        id="field-description"
        label="Keterangan singkat"
        placeholder="Contoh: Keamanan aplikasi, jaringan, audit"
        hint="Tampil di bawah nama bidang saat onboarding."
        error={errors.description?.message}
        {...register('description')}
      />
    </FormDialog>
  );
}
