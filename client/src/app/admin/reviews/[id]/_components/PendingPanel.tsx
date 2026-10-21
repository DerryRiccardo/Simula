import { Loader2 } from 'lucide-react';

import { formatBusinessDaysLeft, formatDate, formatRelative } from '@/lib/formatters';
import { getReviewUrgency } from '@/lib/review';
import { cn } from '@/lib/utils';
import type { IAdminReviewItem } from '@/types';

// Belum ada hasil: penilaian AI sedang berjalan, atau submission B2B menunggu reviewer.
export function PendingPanel({ item }: { item: IAdminReviewItem }) {
  if (item.status === 'ai_grading') {
    return (
      <section className="rounded-card border border-line bg-white p-5">
        <p className="flex items-center gap-2 text-sm font-medium text-ink">
          <Loader2 className="size-4 animate-spin text-ai" />
          Sedang dinilai AI
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          AI menilai satu kriteria rubrik per tahap, lalu menyusun feedback. Halaman ini diperbarui
          otomatis begitu hasilnya keluar.
        </p>
      </section>
    );
  }

  const urgency = item.reviewDueAt ? getReviewUrgency(item.reviewDueAt) : null;
  return (
    <section className="rounded-card border border-line bg-white p-5">
      <p className="text-sm font-medium text-ink">Menunggu review</p>
      {item.reviewDueAt && (
        <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-line pt-4">
          <div>
            <p className="text-xs text-ink-subtle">Batas SLA review</p>
            <p className="mt-0.5 font-mono text-sm text-ink tabular-nums">
              {formatDate(item.reviewDueAt)}
            </p>
          </div>
          <p
            className={cn(
              'text-right text-xs',
              urgency ? 'font-semibold text-brand' : 'text-ink-subtle'
            )}
          >
            {urgency === 'overdue' ? 'Melewati SLA' : formatBusinessDaysLeft(item.reviewDueAt)}
          </p>
        </div>
      )}
      <div className="mt-4 border-t border-line pt-4">
        <p className="text-xs text-ink-subtle">Reviewer</p>
        <p className="mt-0.5 text-sm text-ink">
          {item.reviewerName ?? 'Belum ditugaskan'}
          {item.reviewerRole && <span className="text-ink-muted">, {item.reviewerRole}</span>}
        </p>
        <p className="mt-1 text-xs text-ink-subtle">
          {item.lastReminderAt
            ? `Pengingat terakhir ${formatRelative(item.lastReminderAt)}`
            : 'Belum pernah diingatkan'}
        </p>
      </div>
    </section>
  );
}
