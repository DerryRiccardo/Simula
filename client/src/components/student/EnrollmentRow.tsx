import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { ENROLLMENT_STATUS } from '@/constants/enrollmentStatus';
import { FIELD_BY_KEY } from '@/constants/fields';
import { formatDeadline, formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { IEnrollment, TEnrollmentStatus } from '@/types';
import { StatusBadge } from './Badges';

const TIER_LABEL = { ai: 'AI Case Study', b2b: 'B2B Case Study' } as const;
const URGENT_STATUSES: TEnrollmentStatus[] = ['revision_requested', 'pending_payment'];

/** Kolom kanan: tenggat bila ada, skor bila sudah dinilai, selain itu waktu pembaruan. */
function getTimeline({ status, deadlineAt, score, updatedAt }: IEnrollment) {
  if (score !== null) return { label: 'Skor', value: String(score) };
  if (deadlineAt) {
    return {
      label: status === 'pending_payment' ? 'Batas bayar' : 'Tenggat',
      value: formatDeadline(deadlineAt),
    };
  }
  return { label: 'Diperbarui', value: formatRelative(updatedAt) };
}

// Mode tabel hanya di layar sangat lebar (xl); di bawahnya status & tenggat turun ke bawah judul,
// agar judul case tidak terpotong. Grid ini dipakai bersama header kolom di EnrollmentList.
export const ENROLLMENT_GRID =
  'xl:grid xl:grid-cols-[minmax(0,1fr)_10rem_8.5rem_10.5rem] xl:items-center xl:gap-6';

interface EnrollmentRowProps {
  enrollment: IEnrollment;
  /** true = aksi tampil sebagai tombol biru (dipakai untuk baris paling mendesak). */
  isPrimary?: boolean;
  /** true = tanpa kolom tabel, untuk area sempit seperti dashboard. */
  isCompact?: boolean;
}

export function EnrollmentRow({
  enrollment,
  isPrimary = false,
  isCompact = false,
}: EnrollmentRowProps) {
  const { caseSummary, status } = enrollment;
  const meta = ENROLLMENT_STATUS[status];
  const field = FIELD_BY_KEY[caseSummary.fieldKey];
  const FieldIcon = field?.icon;
  const isAi = caseSummary.tier === 'ai';
  const timeline = getTimeline(enrollment);
  const isUrgent = URGENT_STATUSES.includes(status);
  const isTable = !isCompact;

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-3 px-5 py-4 transition-colors duration-200 hover:bg-surface-soft/70 sm:flex-row sm:items-center sm:gap-5',
        isTable && ENROLLMENT_GRID
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3.5">
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-control',
            isAi ? 'bg-ai-soft text-ai' : 'bg-brand-soft text-brand'
          )}
          aria-hidden="true"
        >
          {FieldIcon && <FieldIcon className="size-[1.0625rem]" strokeWidth={1.75} />}
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              'text-sm leading-snug font-semibold text-pretty md:text-sm',
              isTable && 'xl:truncate'
            )}
          >
            {caseSummary.title}
          </h3>
          <p className="mt-0.5 truncate text-xs text-ink-subtle">
            <span className={isAi ? 'text-ai' : 'text-brand'}>{TIER_LABEL[caseSummary.tier]}</span>
            <span aria-hidden="true"> / </span>
            {field?.label}
          </p>
          <div
            className={cn(
              'mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5',
              isTable && 'xl:hidden'
            )}
          >
            <StatusBadge status={status} />
            <Timeline timeline={timeline} isUrgent={isUrgent} isInline />
          </div>
        </div>
      </div>

      {isTable && (
        <>
          <div className="hidden xl:block">
            <StatusBadge status={status} />
          </div>
          <div className="hidden xl:block">
            <Timeline timeline={timeline} isUrgent={isUrgent} />
          </div>
        </>
      )}

      <div className="pl-[3.125rem] sm:pl-0 xl:flex xl:justify-end">
        {/* Seluruh baris bisa diklik lewat pseudo-element pada tautan aksi. */}
        <Link
          href={meta.getHref(caseSummary)}
          className={cn(
            'inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap outline-none after:absolute after:inset-0 after:content-[""] focus-visible:after:ring-3 focus-visible:after:ring-brand/30 focus-visible:after:ring-inset',
            isPrimary
              ? 'h-9 rounded-full bg-brand px-4 text-white transition-colors group-hover:bg-brand-hover'
              : 'text-brand'
          )}
        >
          {meta.actionLabel}
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          <span className="sr-only">: {caseSummary.title}</span>
        </Link>
      </div>
    </div>
  );
}

interface TimelineProps {
  timeline: { label: string; value: string };
  isUrgent: boolean;
  isInline?: boolean;
}

function Timeline({ timeline, isUrgent, isInline = false }: TimelineProps) {
  return (
    <p className={cn('flex text-xs', isInline ? 'gap-1.5' : 'flex-col gap-0.5')}>
      <span className="text-ink-subtle">{timeline.label}</span>
      <span
        className={cn(
          'font-mono tabular-nums',
          isUrgent ? 'font-semibold text-ink' : 'text-ink-muted'
        )}
      >
        {timeline.value}
      </span>
    </p>
  );
}
