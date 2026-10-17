'use client';

import { Controller, useFormContext } from 'react-hook-form';

import { TextField } from '@/components/forms';
import type { IAdminCaseInput } from '@/types';
import { BuilderSection, toNumberInput } from './BuilderParts';

// Komersial (bagian 6, B2B saja): harga, tenggat, mitra, dan jabatan reviewer yang ditugaskan.
export function CommercialSection() {
  const { control, register, formState } = useFormContext<IAdminCaseInput>();
  const { errors } = formState;

  return (
    <BuilderSection
      id="commercial"
      title="Komersial dan mitra"
      description="Harga dibayar peserta. Tenggat dihitung sejak peserta klik Mulai mengerjakan. Jabatan reviewer tampil di detail case dan sertifikat."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Controller
          control={control}
          name="price"
          render={({ field, fieldState }) => (
            <TextField
              id="case-price"
              label="Harga (Rp)"
              min={0}
              step={1000}
              error={fieldState.error?.message}
              {...toNumberInput(field)}
            />
          )}
        />
        <Controller
          control={control}
          name="deadlineDays"
          render={({ field, fieldState }) => (
            <TextField
              id="case-deadline"
              label="Tenggat pengerjaan (hari)"
              min={1}
              error={fieldState.error?.message}
              {...toNumberInput(field)}
            />
          )}
        />
        <TextField
          id="partner-name"
          label="Nama mitra"
          placeholder="Sagara Commerce"
          error={errors.partnerName?.message}
          {...register('partnerName')}
        />
        <TextField
          id="partner-industry"
          label="Industri mitra"
          placeholder="E-commerce"
          error={errors.partnerIndustry?.message}
          {...register('partnerIndustry')}
        />
      </div>
      <TextField
        id="reviewer-role"
        label="Jabatan reviewer"
        placeholder="Senior Backend Engineer"
        hint="Prototype: semua B2B case ditugaskan ke akun reviewer demo."
        error={errors.reviewerRole?.message}
        {...register('reviewerRole')}
      />
    </BuilderSection>
  );
}
