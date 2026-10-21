'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { FormDialog } from '@/components/admin';
import { TextareaField, TextField } from '@/components/forms';
import { useSavePartner } from '@/hooks/useAdminPartners';
import { getApiFieldErrors } from '@/lib/apiError';
import type { IAdminPartner } from '@/types';

const schema = z.object({
  name: z.string().trim().min(2, 'Tulis minimal 2 karakter.'),
  industry: z.string().trim().min(2, 'Tulis minimal 2 karakter.'),
  about: z.string().trim().min(20, 'Tulis minimal 20 karakter.'),
});
type TPartnerValues = z.infer<typeof schema>;

interface PartnerFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** null = mitra baru. */
  partner: IAdminPartner | null;
}

export function PartnerFormDialog({ isOpen, onOpenChange, partner }: PartnerFormDialogProps) {
  const save = useSavePartner();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<TPartnerValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (isOpen) {
      reset({
        name: partner?.name ?? '',
        industry: partner?.industry ?? '',
        about: partner?.about ?? '',
      });
    }
  }, [isOpen, partner, reset]);

  const handleSave = handleSubmit((values) =>
    save.mutate(
      { id: partner?.id ?? null, payload: values },
      {
        onSuccess: () => onOpenChange(false),
        onError: (error) =>
          getApiFieldErrors(error).forEach(({ field, message }) =>
            setError(field as keyof TPartnerValues, { message })
          ),
      }
    )
  );

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={partner ? 'Ubah mitra' : 'Tambah mitra'}
      description="Profil mitra tampil di halaman detail B2B case dan di sertifikat berlogo mitra."
      submitLabel={partner ? 'Simpan' : 'Tambah mitra'}
      isPending={save.isPending}
      onSubmit={handleSave}
    >
      <TextField
        id="partner-name"
        label="Nama perusahaan"
        placeholder="Contoh: Sagara Commerce"
        error={errors.name?.message}
        {...register('name')}
      />
      <TextField
        id="partner-industry"
        label="Industri"
        placeholder="Contoh: E-commerce"
        error={errors.industry?.message}
        {...register('industry')}
      />
      <TextareaField
        id="partner-about"
        label="Profil singkat"
        rows={3}
        placeholder="Apa yang dikerjakan perusahaan ini, dalam satu atau dua kalimat."
        error={errors.about?.message}
        {...register('about')}
      />
    </FormDialog>
  );
}
