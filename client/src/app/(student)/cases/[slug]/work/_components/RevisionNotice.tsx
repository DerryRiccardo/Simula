import { RotateCcw } from 'lucide-react';

import { formatRelative } from '@/lib/formatters';
import type { IRevisionRequest } from '@/types';

// "Perlu revisi" ≠ "Belum lulus" (CONTEXT.md 4.8): submission belum dinilai, skor tidak berkurang.
export function RevisionNotice({ revision }: { revision: IRevisionRequest }) {
  return (
    <section
      aria-labelledby="revision-title"
      className="rounded-card border border-brand/40 bg-white p-5"
    >
      <div className="flex items-start gap-3">
        <RotateCcw className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={2} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 id="revision-title" className="text-sm md:text-sm">
              Dikembalikan untuk revisi
            </h2>
            <span className="text-xs text-ink-subtle">
              {revision.reviewerRole}, {formatRelative(revision.requestedAt)}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-ink">{revision.reason}</p>
          <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-ink-muted">
            {revision.note}
          </p>
          <p className="mt-3 text-xs text-ink-subtle">
            Submission ini belum dinilai, jadi tidak mengurangi skormu. Perbaiki lalu kirim ulang.
          </p>
        </div>
      </div>
    </section>
  );
}
