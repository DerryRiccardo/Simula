'use client';

import { useId, useState, type DragEvent } from 'react';
import { FileText, Link2, Upload, X } from 'lucide-react';

import { formatFileSize } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ISubmissionSlot, TSlotValue } from '@/types';
import { isFileMeta, validateFile } from '../_schema';

interface SlotFieldProps {
  slot: ISubmissionSlot;
  value: TSlotValue;
  onChange: (value: TSlotValue) => void;
  onBlur: () => void;
  error?: string;
  /** Untuk error validasi berkas yang terjadi sebelum nilai disimpan ke form. */
  onFileError: (message: string) => void;
}

const inputClass =
  'w-full rounded-control border bg-white text-sm text-ink transition-colors outline-none placeholder:text-ink-subtle hover:border-ink/25 focus:border-brand focus:ring-3 focus:ring-brand/15 aria-invalid:border-error aria-invalid:ring-error/15';

function FilePicker({
  slot,
  value,
  onChange,
  onFileError,
  error,
  inputId,
}: SlotFieldProps & { inputId: string }) {
  const [isDragging, setIsDragging] = useState(false);
  const formatLabel = slot.formats?.map((format) => format.toUpperCase()).join(', ');

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    const problem = validateFile(slot, file);
    if (problem) return onFileError(problem);
    onChange({ fileName: file.name, sizeBytes: file.size });
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    pickFile(event.dataTransfer.files[0]);
  };

  const accept = slot.formats?.map((format) => `.${format}`).join(',');
  const fileInput = (
    <input
      id={inputId}
      type="file"
      accept={accept}
      className="sr-only"
      aria-invalid={error ? true : undefined}
      onChange={(event) => {
        pickFile(event.target.files?.[0]);
        event.target.value = '';
      }}
    />
  );

  if (isFileMeta(value)) {
    return (
      <div className="flex items-center gap-3 rounded-control border border-line bg-surface-soft/60 px-3 py-2.5">
        <FileText className="size-4 shrink-0 text-ink-muted" strokeWidth={1.75} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-ink">{value.fileName}</p>
          <p className="font-mono text-[0.6875rem] text-ink-subtle tabular-nums">
            {formatFileSize(value.sizeBytes)}
          </p>
        </div>
        <label
          htmlFor={inputId}
          className="cursor-pointer text-xs font-medium text-brand hover:underline"
        >
          Ganti
          {fileInput}
        </label>
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label={`Hapus berkas ${value.fileName}`}
          className="grid size-7 place-items-center rounded-tag text-ink-subtle transition-colors hover:bg-white hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <label
      htmlFor={inputId}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-control border border-dashed px-3 py-3 transition-colors focus-within:ring-3 focus-within:ring-brand/15',
        isDragging ? 'border-brand bg-brand-soft' : 'border-line hover:border-ink/30',
        error && 'border-error'
      )}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-tag bg-surface-soft text-ink-muted">
        <Upload className="size-4" strokeWidth={1.75} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">Pilih atau seret berkas</span>
        <span className="block text-xs text-ink-subtle">
          {formatLabel}
          {slot.maxSizeMb ? `, maks. ${slot.maxSizeMb} MB` : ''}
        </span>
      </span>
      {fileInput}
    </label>
  );
}

export function SlotField(props: SlotFieldProps) {
  const { slot, value, onChange, onBlur, error } = props;
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const textValue = typeof value === 'string' ? value : '';

  return (
    <div className="grid gap-2">
      <div>
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={inputId} className="text-sm font-medium text-ink">
            {slot.title}
          </label>
          <span className="text-[0.6875rem] text-ink-subtle">
            {slot.isRequired ? 'Wajib' : 'Opsional'}
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{slot.description}</p>
      </div>

      {slot.kind === 'file' && <FilePicker {...props} inputId={inputId} />}

      {slot.kind === 'link' && (
        <div className="relative">
          <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle" />
          <input
            id={inputId}
            type="url"
            inputMode="url"
            value={textValue}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            placeholder={slot.linkHint ?? 'https://'}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={cn(inputClass, 'h-10 border-line pr-3 pl-9 font-mono text-[0.8125rem]')}
          />
        </div>
      )}

      {slot.kind === 'text' && (
        <textarea
          id={inputId}
          rows={5}
          value={textValue}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(inputClass, 'resize-y border-line px-3 py-2.5 leading-relaxed')}
        />
      )}

      {error && (
        <p id={errorId} className="text-xs text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
