'use client';

import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import { TextField } from '@/components/forms';
import { Checkbox, Label, NativeSelect } from '@/components/ui';
import type { IAdminCaseInput, TSlotKind, TTier } from '@/types';
import { AddItemButton, BuilderSection, ItemCard, toNumberInput } from './BuilderParts';

// AI hanya bisa membaca isian teks, berkas yang bisa diproses, dan repo GitHub publik
// (CONTEXT.md 4.5); tautan Google Drive tidak bisa dibuka AI.
const KIND_OPTIONS: Record<TTier, { value: TSlotKind; label: string }[]> = {
  ai: [
    { value: 'file', label: 'Unggah berkas' },
    { value: 'link', label: 'Repositori GitHub publik' },
    { value: 'text', label: 'Isian teks' },
  ],
  b2b: [
    { value: 'file', label: 'Unggah berkas' },
    { value: 'link', label: 'Tautan (repo, Drive, Figma)' },
  ],
};

// Slot deliverable (bagian 4): satu slot = satu isian di form submission peserta.
export function SlotsSection() {
  const { control, register, formState } = useFormContext<IAdminCaseInput>();
  const { errors } = formState;
  const tier = useWatch({ control, name: 'tier' });
  const slotValues = useWatch({ control, name: 'slots' });
  const slots = useFieldArray({ control, name: 'slots' });

  return (
    <BuilderSection
      id="slots"
      title="Slot deliverable"
      description={
        tier === 'ai'
          ? 'Format harus bisa dibaca AI: isian teks, berkas PDF, DOCX, XLSX, atau kode, dan repositori GitHub publik.'
          : 'Setiap slot punya aturan sendiri. Tombol submit peserta baru aktif setelah semua slot wajib terisi.'
      }
    >
      {errors.slots?.root?.message && (
        <p className="text-xs text-destructive" role="alert">
          {errors.slots.root.message}
        </p>
      )}
      {slots.fields.map((slot, index) => (
        <ItemCard
          key={slot.id}
          label={`Slot ${index + 1}`}
          onRemove={slots.fields.length > 1 ? () => slots.remove(index) : undefined}
        >
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
            <TextField
              id={`slot-${index}-title`}
              label="Nama slot"
              placeholder="Design doc"
              error={errors.slots?.[index]?.title?.message}
              {...register(`slots.${index}.title`)}
            />
            <div className="grid gap-1.5">
              <Label htmlFor={`slot-${index}-kind`} className="text-sm font-medium text-ink">
                Jenis
              </Label>
              <NativeSelect id={`slot-${index}-kind`} {...register(`slots.${index}.kind`)}>
                {KIND_OPTIONS[tier].map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <TextField
            id={`slot-${index}-description`}
            label="Petunjuk untuk peserta"
            {...register(`slots.${index}.description`)}
          />
          {slotValues[index]?.kind === 'file' && (
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <TextField
                id={`slot-${index}-formats`}
                label="Format diterima"
                hint="Pisahkan dengan koma, tanpa titik."
                placeholder="pdf, docx"
                {...register(`slots.${index}.formats`)}
              />
              <Controller
                control={control}
                name={`slots.${index}.maxSizeMb`}
                render={({ field, fieldState }) => (
                  <TextField
                    id={`slot-${index}-size`}
                    label="Ukuran maks. (MB)"
                    min={1}
                    error={fieldState.error?.message}
                    {...toNumberInput(field)}
                  />
                )}
              />
            </div>
          )}
          <Controller
            control={control}
            name={`slots.${index}.isRequired`}
            render={({ field }) => (
              <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-ink">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
                Wajib diisi
              </label>
            )}
          />
        </ItemCard>
      ))}
      <AddItemButton
        label="Tambah slot"
        onClick={() =>
          slots.append({
            title: '',
            description: '',
            kind: 'file',
            isRequired: true,
            formats: 'pdf, docx',
            maxSizeMb: 10,
          })
        }
      />
    </BuilderSection>
  );
}
