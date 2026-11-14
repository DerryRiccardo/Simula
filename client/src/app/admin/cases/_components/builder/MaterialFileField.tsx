'use client';

import { useRef, useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { useFormContext, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui';
import { handleApiError } from '@/lib/apiError';
import { formatFileSize } from '@/lib/formatters';
import { adminService } from '@/services/admin';
import type { IAdminCaseInput } from '@/types';

// Sama dengan server (entity.MaterialFormats dan MaterialMaxSizeMB).
const MATERIAL_FORMATS = [
  'pdf',
  'docx',
  'xlsx',
  'pptx',
  'csv',
  'zip',
  'txt',
  'md',
  'png',
  'jpg',
  'jpeg',
];
const MATERIAL_MAX_SIZE_MB = 50;

const getExtension = (fileName: string) => fileName.split('.').pop()?.toLowerCase() ?? '';

/** Berkas satu materi: diunggah langsung ke storage, form hanya menyimpan fileId-nya. */
export function MaterialFileField({ index }: { index: number }) {
  const { control, setValue, getValues, clearErrors, setError, formState } =
    useFormContext<IAdminCaseInput>();
  const material = useWatch({ control, name: `materials.${index}` });
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const error = formState.errors.materials?.[index]?.fileId?.message;
  const isUploading = progress !== null;

  const handleFile = async (file: File) => {
    const extension = getExtension(file.name);
    if (!MATERIAL_FORMATS.includes(extension)) {
      setError(`materials.${index}.fileId`, {
        message: `Format .${extension} tidak didukung. Pakai ${MATERIAL_FORMATS.join(', ')}.`,
      });
      return;
    }
    if (file.size > MATERIAL_MAX_SIZE_MB * 1024 * 1024) {
      setError(`materials.${index}.fileId`, {
        message: `Ukuran maksimal ${MATERIAL_MAX_SIZE_MB} MB.`,
      });
      return;
    }
    setProgress(0);
    try {
      const uploaded = await adminService.uploadMaterial({ file, onProgress: setProgress });
      const options = { shouldDirty: true };
      setValue(`materials.${index}.fileId`, uploaded.fileId, options);
      setValue(`materials.${index}.fileName`, uploaded.fileName, options);
      setValue(`materials.${index}.sizeBytes`, uploaded.sizeBytes, options);
      setValue(`materials.${index}.format`, extension.toUpperCase(), options);
      if (!getValues(`materials.${index}.name`).trim()) {
        setValue(`materials.${index}.name`, uploaded.fileName, options);
      }
      clearErrors(`materials.${index}.fileId`);
    } catch (uploadError) {
      handleApiError(uploadError, 'Berkas gagal diunggah. Coba lagi.');
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="grid gap-1.5">
      <p className="text-sm font-medium text-ink">Berkas</p>
      <div className="flex flex-wrap items-center gap-3 rounded-control border border-dashed border-line bg-white px-4 py-3">
        <FileText className="size-5 shrink-0 text-ink-subtle" strokeWidth={1.5} />
        <p className="min-w-0 flex-1 text-sm text-ink-muted">
          {isUploading ? (
            <span className="font-mono tabular-nums">Mengunggah {progress}%</span>
          ) : material?.fileName ? (
            <>
              <span className="font-medium break-all text-ink">{material.fileName}</span>
              {material.sizeBytes !== null && (
                <span className="ml-2 font-mono text-xs text-ink-subtle tabular-nums">
                  {formatFileSize(material.sizeBytes)}
                </span>
              )}
            </>
          ) : (
            `Belum ada berkas. ${MATERIAL_FORMATS.join(', ').toUpperCase()}, maks. ${MATERIAL_MAX_SIZE_MB} MB.`
          )}
        </p>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          accept={MATERIAL_FORMATS.map((format) => `.${format}`).join(',')}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void handleFile(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="pill"
          disabled={isUploading}
          aria-invalid={error ? true : undefined}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-4" />
          {material?.fileId ? 'Ganti berkas' : 'Unggah berkas'}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
