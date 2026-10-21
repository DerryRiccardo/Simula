'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { FormDialog } from '@/components/admin';
import { TextField } from '@/components/forms';
import { Label, NativeSelect } from '@/components/ui';
import { useCreateReviewer } from '@/hooks/useAdminPartners';
import { getApiFieldErrors } from '@/lib/apiError';
import type { IAdminPartner } from '@/types';

const schema = z.object({
  name: z.string().trim().min(3, 'Tulis minimal 3 karakter.'),
  email: z.string().trim().email('Format email tidak valid.'),
  partnerId: z.string().min(1, 'Pilih mitra.'),
  jobTitle: z.string().trim().min(3, 'Tulis minimal 3 karakter.'),
});
type TReviewerValues = z.infer<typeof schema>;

interface ReviewerFormDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  partners: IAdminPartner[];
  /** Mitra yang sudah terpilih, mis. saat tab reviewer sedang difilter ke satu mitra. */
  defaultPartnerId: string | null;
}

export function ReviewerFormDialog({
  isOpen,
  onOpenChange,
  partners,
  defaultPartnerId,
}: ReviewerFormDialogProps) {
  const create = useCreateReviewer();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<TReviewerValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (isOpen) reset({ name: '', email: '', partnerId: defaultPartnerId ?? '', jobTitle: '' });
  }, [isOpen, defaultPartnerId, reset]);

  const handleSave = handleSubmit((values) =>
    create.mutate(values, {
      onSuccess: () => onOpenChange(false),
      onError: (error) =>
        getApiFieldErrors(error).forEach(({ field, message }) =>
          setError(field as keyof TReviewerValues, { message })
        ),
    })
  );

  return (
    <FormDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Tambah reviewer"
      description="Reviewer adalah praktisi dari perusahaan mitra. Undangan untuk mengatur password dikirim ke emailnya, lalu atur case yang ia nilai."
      submitLabel="Tambah dan undang"
      isPending={create.isPending}
      onSubmit={handleSave}
    >
      <TextField
        id="reviewer-name"
        label="Nama lengkap"
        autoComplete="off"
        error={errors.name?.message}
        {...register('name')}
      />
      <TextField
        id="reviewer-email"
        label="Email kantor"
        type="email"
        autoComplete="off"
        placeholder="nama@perusahaan.co.id"
        error={errors.email?.message}
        {...register('email')}
      />
      <div className="grid gap-1.5">
        <Label htmlFor="reviewer-partner" className="text-sm font-medium text-ink">
          Mitra
        </Label>
        <NativeSelect
          id="reviewer-partner"
          aria-invalid={errors.partnerId ? true : undefined}
          aria-describedby={errors.partnerId ? 'reviewer-partner-error' : undefined}
          {...register('partnerId')}
        >
          <option value="">Pilih mitra</option>
          {partners.map((partner) => (
            <option key={partner.id} value={partner.id}>
              {partner.name}
            </option>
          ))}
        </NativeSelect>
        {errors.partnerId && (
          <p id="reviewer-partner-error" className="text-xs text-destructive" role="alert">
            {errors.partnerId.message}
          </p>
        )}
      </div>
      <TextField
        id="reviewer-job"
        label="Jabatan"
        placeholder="Contoh: Senior Backend Engineer"
        hint="Tampil ke peserta sebagai peran penilai."
        error={errors.jobTitle?.message}
        {...register('jobTitle')}
      />
    </FormDialog>
  );
}
