'use client';

import { Controller, useFormContext } from 'react-hook-form';

import { TextareaField, TextField } from '@/components/forms';
import { FilterTabs } from '@/components/student';
import { Label, NativeSelect } from '@/components/ui';
import { CASE_LEVEL_LABEL } from '@/constants/caseLevel';
import { FIELD_OPTIONS } from '@/constants/fields';
import type { IAdminCaseInput, TCaseLevel, TTier } from '@/types';
import { DEFAULT_PASSING_SCORE } from '@/app/admin/cases/_schema';
import { BuilderSection } from './BuilderParts';

const TIER_OPTIONS: { value: TTier; label: string }[] = [
  { value: 'ai', label: 'AI Case Study' },
  { value: 'b2b', label: 'B2B Case Study' },
];

// Info umum (CONTEXT.md 4.11 bagian 1): yang tampil di katalog dan halaman detail case.
export function GeneralSection({ isTierLocked }: { isTierLocked: boolean }) {
  const { control, register, formState, setValue, getValues } = useFormContext<IAdminCaseInput>();
  const { errors } = formState;

  const handleTierChange = (tier: TTier) => {
    setValue('tier', tier, { shouldDirty: true });
    // Ambang lulus mengikuti usulan default tier selama admin belum mengubahnya.
    const passingScore = getValues('passingScore');
    if (Object.values(DEFAULT_PASSING_SCORE).includes(passingScore)) {
      setValue('passingScore', DEFAULT_PASSING_SCORE[tier], { shouldDirty: true });
    }
  };

  return (
    <BuilderSection
      id="general"
      title="Info umum"
      description="Tampil di katalog dan halaman detail sebelum peserta mulai atau membayar."
    >
      <Controller
        control={control}
        name="tier"
        render={({ field }) => (
          <div className="grid gap-1.5">
            <p className="text-sm font-medium text-ink">Tier</p>
            {isTierLocked ? (
              <p className="text-sm text-ink-muted">
                {TIER_OPTIONS.find((option) => option.value === field.value)?.label}. Tier tidak
                bisa diubah setelah case dibuat.
              </p>
            ) : (
              <FilterTabs
                ariaLabel="Tier"
                options={TIER_OPTIONS}
                value={field.value}
                onChange={handleTierChange}
              />
            )}
          </div>
        )}
      />

      <TextField
        id="case-title"
        label="Judul"
        placeholder="Contoh: Optimasi API Endpoint Produk yang Lambat"
        error={errors.title?.message}
        {...register('title')}
      />

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="case-field" className="text-sm font-medium text-ink">
            Bidang
          </Label>
          <NativeSelect
            id="case-field"
            aria-invalid={errors.fieldKey ? true : undefined}
            {...register('fieldKey')}
          >
            <option value="">Pilih bidang</option>
            {FIELD_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
          {errors.fieldKey && (
            <p className="text-xs text-destructive" role="alert">
              {errors.fieldKey.message}
            </p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="case-level" className="text-sm font-medium text-ink">
            Level
          </Label>
          <NativeSelect id="case-level" {...register('level')}>
            {(Object.entries(CASE_LEVEL_LABEL) as [TCaseLevel, string][]).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <TextField
          id="case-duration"
          label="Durasi"
          placeholder="3-4 jam"
          error={errors.durationLabel?.message}
          {...register('durationLabel')}
        />
      </div>

      <TextareaField
        id="case-summary"
        label="Ringkasan publik"
        hint="Satu sampai dua kalimat untuk kartu katalog."
        error={errors.summary?.message}
        {...register('summary')}
      />
    </BuilderSection>
  );
}
