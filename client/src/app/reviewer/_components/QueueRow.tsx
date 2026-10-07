import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { StatusBadge } from '@/components/student';
import { Button } from '@/components/ui';
import { FIELD_BY_KEY } from '@/constants/fields';
import { PATHS } from '@/constants/paths';
import { formatBusinessDaysLeft, formatDate, formatRelative } from '@/lib/formatters';
import { getReviewUrgency } from '@/lib/review';
import { cn } from '@/lib/utils';
import type { IReviewQueueItem, TEnrollmentStatus } from '@/types';

/** Keputusan dari sudut pandang reviewer; "Perlu revisi" bukan tugas reviewer lagi. */
export const DECISION_LABEL: Partial<Record<TEnrollmentStatus, string>> = {
  revision_requested: 'Dikembalikan',
  passed: 'Lulus',
  failed: 'Belum lulus',
};

// Kolom tabel hanya di layar lebar; di bawahnya tanggal dan aksi turun ke bawah judul.
export const QUEUE_GRID =
  'lg:grid lg:grid-cols-[minmax(0,1fr)_9rem_11rem_7rem] lg:items-center lg:gap-6';

function Cell({ label, value, hint }: { label: string; value: string; hint?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-ink-subtle lg:hidden">{label}</p>
      <p className="font-mono text-[0.8125rem] text-ink tabular-nums">{value}</p>
      {hint && <div className="mt-0.5 text-xs">{hint}</div>}
    </div>
  );
}

interface QueueRowProps {
  item: IReviewQueueItem;
  /** true = baris paling mendesak, aksinya tombol biru. */
  isPrimary?: boolean;
}

export function QueueRow({ item, isPrimary = false }: QueueRowProps) {
  const field = FIELD_BY_KEY[item.caseSummary.fieldKey];
  const FieldIcon = field?.icon;
  const isPending = item.status === 'in_review';
  const urgency = isPending ? getReviewUrgency(item.reviewDueAt) : null;
  const href = PATHS.reviewerSubmission(item.id);

  return (
    <div
      className={cn(
        'group relative grid gap-4 px-5 py-4 transition-colors duration-200 hover:bg-surface-soft/70 sm:grid-cols-2',
        QUEUE_GRID
      )}
    >
      <div className="flex min-w-0 items-start gap-3.5 sm:col-span-2 lg:col-span-1">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-control bg-brand-soft text-brand"
          aria-hidden="true"
        >
          {FieldIcon && <FieldIcon className="size-[1.0625rem]" strokeWidth={1.75} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-mono text-xs font-medium text-ink tabular-nums">
              {item.candidateLabel}
            </p>
            {item.attempt > 1 && (
              <span className="rounded-tag bg-surface-soft px-1.5 py-px text-[0.6875rem] font-medium text-ink-muted">
                Submit ulang, percobaan {item.attempt}
              </span>
            )}
          </div>
          <h3 className="mt-1 text-sm leading-snug font-semibold text-pretty md:text-sm lg:truncate">
            {item.caseSummary.title}
          </h3>
          <p className="mt-0.5 truncate text-xs text-ink-subtle">
            {item.caseSummary.partnerName}
            {field && <> / {field.label}</>}
          </p>
        </div>
      </div>

      {isPending ? (
        <>
          <Cell
            label="Dikirim"
            value={formatDate(item.submittedAt)}
            hint={<span className="text-ink-subtle">{formatRelative(item.submittedAt)}</span>}
          />
          <Cell
            label="Tenggat review"
            value={formatDate(item.reviewDueAt)}
            hint={
              urgency === 'overdue' ? (
                <span className="inline-flex rounded-tag bg-white px-1.5 py-px font-semibold text-brand ring-1 ring-brand/50 ring-inset">
                  Melewati SLA
                </span>
              ) : (
                <span
                  className={cn(
                    'font-mono tabular-nums',
                    urgency === 'soon' ? 'font-semibold text-brand' : 'text-ink-muted'
                  )}
                >
                  {formatBusinessDaysLeft(item.reviewDueAt)}
                </span>
              )
            }
          />
        </>
      ) : (
        <>
          <Cell
            label="Diputuskan"
            value={item.decidedAt ? formatDate(item.decidedAt) : '-'}
            hint={<span className="text-ink-subtle">Percobaan {item.attempt}</span>}
          />
          <div className="min-w-0">
            <p className="text-xs text-ink-subtle lg:hidden">Keputusan</p>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                status={item.status}
                label={DECISION_LABEL[item.status]}
                tone={item.status === 'revision_requested' ? 'neutral' : undefined}
              />
              {item.score !== null && (
                <span className="font-mono text-[0.8125rem] text-ink tabular-nums">
                  {item.score}
                </span>
              )}
            </div>
            {item.isRecommended && (
              <p className="mt-1 text-xs text-ink-muted">Direkomendasikan interview</p>
            )}
          </div>
        </>
      )}

      <div className="sm:col-span-2 lg:col-span-1 lg:text-right">
        {isPending ? (
          <Button
            asChild
            size="pill"
            variant={isPrimary ? 'default' : 'outline'}
            className="w-full sm:w-auto"
          >
            <Link href={href}>
              Nilai
              <ArrowRight className="size-4" />
              <span className="sr-only">: {item.candidateLabel}</span>
            </Link>
          </Button>
        ) : (
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-3 focus-visible:after:ring-brand/30"
          >
            Lihat
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            <span className="sr-only">: {item.candidateLabel}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
