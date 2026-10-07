import type { ReactNode } from 'react';
import { ExternalLink, FileText } from 'lucide-react';

import { formatDate, formatFileSize, formatTime } from '@/lib/formatters';
import { isFileMeta } from '@/lib/submission';
import type { ISubmissionRecord, ISubmissionSlot } from '@/types';

interface SubmittedSummaryProps {
  submission: ISubmissionRecord | null;
  slots: ISubmissionSlot[];
  /** Pemberitahuan di bagian atas kartu, misalnya status penilaian. */
  notice?: ReactNode;
}

// Tampilan baca-saja isi submission terakhir: dipakai halaman pengerjaan dan halaman status.
export function SubmittedSummary({ submission, slots, notice }: SubmittedSummaryProps) {
  return (
    <section aria-labelledby="submitted-title" className="rounded-card border border-line bg-white">
      {notice}

      <div className="p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="submitted-title" className="text-[0.9375rem] md:text-[0.9375rem]">
            Submission terkirim
          </h2>
          {submission && (
            <span className="font-mono text-xs text-ink-subtle tabular-nums">
              Percobaan {submission.attempt}
            </span>
          )}
        </div>
        {submission ? (
          <>
            <p className="mt-1 font-mono text-xs text-ink-subtle tabular-nums">
              {formatDate(submission.submittedAt)}, {formatTime(submission.submittedAt)}
            </p>
            <ul className="mt-5 grid gap-4">
              {slots.map((slot) => {
                const value = submission.values[slot.id] ?? null;
                return (
                  <li key={slot.id} className="min-w-0">
                    <p className="text-xs text-ink-subtle">{slot.title}</p>
                    {isFileMeta(value) ? (
                      <p className="mt-1 flex items-center gap-2 text-sm text-ink">
                        <FileText className="size-4 shrink-0 text-ink-subtle" strokeWidth={1.75} />
                        <span className="truncate">{value.fileName}</span>
                        <span className="shrink-0 font-mono text-xs text-ink-subtle">
                          {formatFileSize(value.sizeBytes)}
                        </span>
                      </p>
                    ) : typeof value === 'string' && value.startsWith('http') ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 flex items-center gap-2 font-mono text-[0.8125rem] break-all text-brand hover:underline"
                      >
                        {value}
                        <ExternalLink className="size-3.5 shrink-0" />
                      </a>
                    ) : value ? (
                      <p className="mt-1 line-clamp-3 text-sm text-ink">{value}</p>
                    ) : (
                      <p className="mt-1 text-sm text-ink-subtle">Tidak diisi</p>
                    )}
                  </li>
                );
              })}
            </ul>
            {submission.note && (
              <div className="mt-5 border-t border-line pt-4">
                <p className="text-xs text-ink-subtle">Catatan untuk reviewer</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{submission.note}</p>
              </div>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-ink-muted">Rincian submission tidak tersedia.</p>
        )}
      </div>
    </section>
  );
}
