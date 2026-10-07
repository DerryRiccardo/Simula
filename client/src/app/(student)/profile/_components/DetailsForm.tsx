'use client';

import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { TextField } from '@/components/forms';
import { FieldPicker, StatusPicker } from '@/components/student';
import { Button } from '@/components/ui';
import { useUpdateProfileDetails } from '@/hooks/useProfile';
import type { IProfile } from '@/types';
import {
  getDetailsDefaults,
  profileDetailsSchema,
  toDetailsPayload,
  type ProfileDetailsFormValues,
} from '../_schema';
import { SettingsSection } from './SettingsSection';

// Data diri + bidang dalam satu form: bilah simpan muncul menempel di bawah saat ada perubahan.
export function DetailsForm({ profile }: { profile: IProfile }) {
  const updateDetails = useUpdateProfileDetails();
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileDetailsFormValues>({
    resolver: zodResolver(profileDetailsSchema),
    defaultValues: getDetailsDefaults(profile),
  });

  // Peringatan saat meninggalkan halaman dengan perubahan yang belum disimpan.
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const onSubmit = (values: ProfileDetailsFormValues) =>
    updateDetails.mutate(toDetailsPayload(values), {
      onSuccess: (updated) => reset(getDetailsDefaults(updated)),
    });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-10">
      <SettingsSection
        id="details"
        title="Data diri"
        description="Nama dipakai di sertifikat. Kampus dan LinkedIn ikut dibagikan ke mitra hanya bila kamu mengizinkan."
      >
        <div className="grid gap-4 rounded-card border border-line bg-white p-5">
          <div className="grid items-start gap-4 sm:grid-cols-2">
            <TextField
              id="name"
              label="Nama lengkap"
              autoComplete="name"
              error={errors.name?.message}
              {...register('name')}
            />
            <TextField
              id="email"
              label="Email"
              value={profile.user.email}
              readOnly
              disabled
              hint="Email dipakai untuk masuk dan belum bisa diubah."
            />
            <TextField
              id="institution"
              label="Kampus (opsional)"
              placeholder="Contoh: Universitas Bina Nusantara"
              autoComplete="organization"
              error={errors.institution?.message}
              {...register('institution')}
            />
            <TextField
              id="major"
              label="Jurusan (opsional)"
              placeholder="Contoh: Sistem Informasi"
              error={errors.major?.message}
              {...register('major')}
            />
          </div>
          <TextField
            id="linkedinUrl"
            label="Profil LinkedIn (opsional)"
            type="url"
            placeholder="https://linkedin.com/in/nama-kamu"
            error={errors.linkedinUrl?.message}
            {...register('linkedinUrl')}
          />
          <div className="border-t border-line pt-4">
            <Controller
              control={control}
              name="studentStatus"
              render={({ field }) => (
                <StatusPicker
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.studentStatus?.message}
                />
              )}
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        id="fields"
        title="Bidang"
        description="Dipakai untuk rekomendasi case di dashboard dan katalog."
      >
        <Controller
          control={control}
          name="fieldKeys"
          render={({ field }) => (
            <FieldPicker
              value={field.value}
              onChange={field.onChange}
              error={errors.fieldKeys?.message}
            />
          )}
        />
      </SettingsSection>

      {isDirty && (
        <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-white/95 px-5 py-3 shadow-lift backdrop-blur">
          <p className="text-sm text-ink-muted">Ada perubahan yang belum disimpan.</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="pill"
              className="text-ink-muted"
              disabled={updateDetails.isPending}
              onClick={() => reset()}
            >
              Batalkan
            </Button>
            <Button type="submit" size="pill" disabled={updateDetails.isPending}>
              {updateDetails.isPending && <Loader2 className="animate-spin" />}
              Simpan perubahan
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
