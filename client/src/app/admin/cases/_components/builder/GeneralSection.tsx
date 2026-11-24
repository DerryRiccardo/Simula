'use client';

import { Controller, useFormContext } from 'react-hook-form';

import { TextareaField, TextField } from '@/components/forms';
import { FilterTabs } from '@/components/student';
import { Label, NativeSelect } from '@/components/ui';
import { CASE_LEVEL_LABEL } from '@/constants/caseLevel';
import { FIELD_BY_KEY } from '@/constants/fields';
import { useActiveFields, usePlatformSettings } from '@/hooks/usePlatform';
import type { IAdminCaseInput, TCaseLevel, TTier } from '@/types';
import { BuilderSection } from './BuilderParts';

const TIER_OPTIONS: { value: TTier; label: string }[] = [
  { value: 'ai', label: 'AI Case Study' },
  { value: 'b2b', label: 'B2B Case Study' },
];

// Info umum (CONTEXT.md 4.11 bagian 1): yang tampil di katalog dan halaman detail case.
export function GeneralSection({ isTierLocked }: { isTierLocked: boolean }) {
  const { control, register, formState, setValue, getValues, watch } =
    useFormContext<IAdminCaseInput>();
  const { errors } = formState;
  const { fields, fieldByKey } = useActiveFields();
  const settings = usePlatformSettings();
  const currentFieldKey = watch('fieldKey');

  const defaultPassingByTier: Record<TTier, number> = {
    ai: settings.passingScoreAi,
    b2b: settings.passingScoreB2b,
  };

  const fieldOptions =
    currentFieldKey && !fieldByKey[currentFieldKey]
      ? [
          ...fields,
          {
            key: currentFieldKey,
            label: `${FIELD_BY_KEY[currentFieldKey]?.label ?? currentFieldKey} (nonaktif)`,
          },
        ]
      : fields;

  const handleTierChange = (tier: TTier) => {
    setValue('tier', tier, { shouldDirty: true });
    // Ambang lulus mengikuti usulan default tier selama admin belum mengubahnya.
    const passingScore = getValues('passingScore');
    if (Object.values(defaultPassingByTier).includes(passingScore)) {
      setValue('passingScore', defaultPassingByTier[tier], { shouldDirty: true });
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
                bisa diubah setelah ada peserta.
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
            {fieldOptions.map((option) => (
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
      </div>

      <TextareaField
        id="case-summary"
        label="Ringkasan publik"
        hint="Satu sampai dua kalimat untuk kartu katalog."
        error={errors.summary?.message}
        {...register('summary')}
      />

      <TextareaField
        id="case-about"
        label="Tentang case"
        rows={4}
        hint="Deskripsi di halaman detail: masalah yang dihadapi dan hasil yang diharapkan."
        error={errors.about?.message}
        {...register('about')}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextareaField
          id="case-activities"
          label="Yang akan dikerjakan"
          rows={4}
          hint="Satu aktivitas per baris."
          error={errors.activities?.message}
          {...register('activities')}
        />
        <TextareaField
          id="case-prerequisites"
          label="Prasyarat"
          rows={4}
          hint="Satu poin per baris. Boleh dikosongkan."
          error={errors.prerequisites?.message}
          {...register('prerequisites')}
        />
      </div>

      <TextField
        id="case-skills"
        label="Skill yang dilatih"
        placeholder="SQL, Excel, Analisis data"
        hint="Pisahkan dengan koma."
        error={errors.skills?.message}
        {...register('skills')}
      />
    </BuilderSection>
  );
}
