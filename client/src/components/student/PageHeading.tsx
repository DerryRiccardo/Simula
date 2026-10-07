import type { ReactNode } from 'react';

interface PageHeadingProps {
  title: string;
  description?: ReactNode;
  /** Ringkasan kecil di bawah deskripsi, misalnya jumlah data. */
  meta?: ReactNode;
  action?: ReactNode;
}

// Judul halaman dashboard: tanpa eyebrow, karena breadcrumb di header sudah memberi konteks.
export function PageHeading({ title, description, meta, action }: PageHeadingProps) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-page-title">{title}</h1>
        {description && (
          <p className="mt-2 max-w-[60ch] text-[0.9375rem] leading-relaxed text-pretty text-ink-muted">
            {description}
          </p>
        )}
        {meta && <div className="mt-3 text-sm text-ink-subtle">{meta}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

interface SectionTitleProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function SectionTitle({ title, description, action }: SectionTitleProps) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg tracking-[-0.01em] md:text-lg">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
