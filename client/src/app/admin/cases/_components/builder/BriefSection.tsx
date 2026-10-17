'use client';

import { useFieldArray, useFormContext } from 'react-hook-form';

import { TextareaField, TextField } from '@/components/forms';
import type { IAdminCaseInput } from '@/types';
import { AddItemButton, BuilderSection, ItemCard } from './BuilderParts';

// Brief lengkap (bagian 2) dan materi pendukung (bagian 3). Brief tampil di halaman, bukan PDF.
export function BriefSection() {
  const { control, register, formState } = useFormContext<IAdminCaseInput>();
  const { errors } = formState;
  const tasks = useFieldArray({ control, name: 'tasks' });
  const materials = useFieldArray({ control, name: 'materials' });

  return (
    <>
      <BuilderSection
        id="brief"
        title="Brief lengkap"
        description="Terbuka setelah peserta mulai (AI) atau membayar (B2B). Ditampilkan langsung di halaman, bukan sebagai PDF."
      >
        <TextareaField
          id="case-context"
          label="Konteks"
          rows={6}
          hint="Latar belakang masalah. Pisahkan paragraf dengan baris kosong."
          error={errors.context?.message}
          {...register('context')}
        />

        <div className="grid gap-3">
          <p className="text-sm font-medium text-ink">Tugas</p>
          {tasks.fields.map((task, index) => (
            <ItemCard
              key={task.id}
              label={`Tugas ${index + 1}`}
              onRemove={tasks.fields.length > 1 ? () => tasks.remove(index) : undefined}
            >
              <TextField
                id={`task-${index}-title`}
                label="Judul"
                error={errors.tasks?.[index]?.title?.message}
                {...register(`tasks.${index}.title`)}
              />
              <TextareaField
                id={`task-${index}-description`}
                label="Deskripsi"
                error={errors.tasks?.[index]?.description?.message}
                {...register(`tasks.${index}.description`)}
              />
            </ItemCard>
          ))}
          <AddItemButton
            label="Tambah tugas"
            onClick={() => tasks.append({ title: '', description: '' })}
          />
        </div>
      </BuilderSection>

      <BuilderSection
        id="materials"
        title="Materi pendukung"
        description="Dataset, dokumentasi, template, atau starter repo yang bisa diunduh peserta. Prototype hanya menyimpan nama dan keterangannya."
      >
        {materials.fields.length === 0 && (
          <p className="text-sm text-ink-subtle">Belum ada materi. Materi bersifat opsional.</p>
        )}
        {materials.fields.map((material, index) => (
          <ItemCard
            key={material.id}
            label={`Materi ${index + 1}`}
            onRemove={() => materials.remove(index)}
          >
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
              <TextField
                id={`material-${index}-name`}
                label="Nama berkas"
                placeholder="data-transaksi.csv"
                error={errors.materials?.[index]?.name?.message}
                {...register(`materials.${index}.name`)}
              />
              <TextField
                id={`material-${index}-format`}
                label="Format"
                placeholder="CSV"
                {...register(`materials.${index}.format`)}
              />
            </div>
            <TextField
              id={`material-${index}-description`}
              label="Keterangan"
              {...register(`materials.${index}.description`)}
            />
          </ItemCard>
        ))}
        <AddItemButton
          label="Tambah materi"
          onClick={() => materials.append({ name: '', format: '', description: '' })}
        />
      </BuilderSection>
    </>
  );
}
