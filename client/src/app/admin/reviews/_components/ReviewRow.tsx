import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, Flag, Sparkles } from 'lucide-react';

import { StatusBadge } from '@/components/student';
import { PATHS } from '@/constants/paths';
import { formatBusinessDaysLeft, formatDate, formatRelative } from '@/lib/formatters';
import { getReviewUrgency } from '@/lib/review';
import { cn } from '@/lib/utils';
import type { IAdminReviewItem } from '@/types';
import { ADMIN_REVIEW_STATUS } from './reviewMeta';

// Kolom tabel hanya di layar lebar; di bawahnya status, skor, dan waktu turun ke bawah judul.
export const REVIEW_GRID =
  'lg:grid lg:grid-cols-[minmax(0,1fr)_9.5rem_5.5rem_9.5rem_4rem] lg:items-center lg:gap-5';

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-ink-subtle lg:hidden">{label}</p>
      {children}
    </div>
  );
}

function TimeCell({ item }: { item: IAdminReviewItem }) {
  if (item.reviewDueAt) {
    const urgency = getReviewUrgency(item.reviewDueAt);
    return (
      <Cell label="Tenggat review">
        <p className="font-mono text-[0.8125rem] text-ink tabular-nums">
          {formatDate(item.reviewDueAt)}
        </p>
        {urgency === 'overdue' ? (
          <span className="mt-0.5 inline-flex rounded-tag bg-white px-1.5 py-px text-xs font-semibold text-brand ring-1 ring-brand/50 ring-inset">
            Melewati SLA
          </span>
        ) : (
          <p
            className={cn(
              'mt-0.5 font-mono text-xs tabular-nums',
              urgency === 'soon' ? 'font-semibold text-brand' : 'text-ink-subtle'
            )}
          >
            {formatBusinessDaysLeft(item.reviewDueAt)}
          </p>
        )}
      </Cell>
    );
  }
  const at = item.decidedAt ?? item.submittedAt;
  return (
    <Cell label={item.decidedAt ? 'Diputuskan' : 'Dikirim'}>
      <p className="font-mono text-[0.8125rem] text-ink tabular-nums">{formatDate(at)}</p>
      <p className="mt-0.5 text-xs text-ink-subtle">{formatRelative(at)}</p>
    </Cell>
  );
}

export function ReviewRow({ item }: { item: IAdminReviewItem }) {
  const status = ADMIN_REVIEW_STATUS[item.status];
  const TierIcon = item.tier === 'ai' ? Sparkles : Building2;
  const context =
    item.tier === 'b2b'
      ? [item.partnerName, item.reviewerName && `reviewer ${item.reviewerName}`]
          .filter(Boolean)
          .join(', ')
      : item.memberEmail;

  return (
    <div
      className={cn(
        'group relative grid grid-cols-2 gap-4 px-5 py-4 transition-colors duration-200 hover:bg-surface-soft/70 sm:grid-cols-3',
        REVIEW_GRID
      )}
    >
      <div className="col-span-2 flex min-w-0 items-start gap-3.5 sm:col-span-3 lg:col-span-1">
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-control',
            item.tier === 'ai' ? 'bg-ai-soft text-ai' : 'bg-brand-soft text-brand'
          )}
          aria-hidden="true"
        >
          <TierIcon className="size-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-semibold text-ink">{item.memberName}</p>
            {item.attempt > 1 && (
              <span className="rounded-tag bg-surface-soft px-1.5 py-px text-[0.6875rem] font-medium text-ink-muted">
                Percobaan {item.attempt}
              </span>
            )}
            {item.isFlagged && (
              <span className="inline-flex items-center gap-1 rounded-tag bg-white px-1.5 py-px text-[0.6875rem] font-semibold text-brand ring-1 ring-brand/50 ring-inset">
                <Flag className="size-3" strokeWidth={2.25} />
                Ditandai
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm leading-snug text-pretty text-ink-muted lg:truncate">
            {item.caseTitle}
          </p>
          {context && <p className="mt-0.5 truncate text-xs text-ink-subtle">{context}</p>}
        </div>
      </div>

      <Cell label="Status">
        <StatusBadge status={item.status} label={status.label} tone={status.tone} />
        {item.isCertificateRevoked && (
          <p className="mt-1 text-xs text-ink-subtle">Sertifikat dicabut</p>
        )}
        {item.isRecommended && !item.isCertificateRevoked && (
          <p className="mt-1 text-xs text-ink-subtle">Direkomendasikan</p>
        )}
      </Cell>

      <Cell label="Skor">
        <p className="font-mono text-[0.8125rem] text-ink tabular-nums">
          {item.score ?? '-'}
          {item.score !== null && <span className="text-ink-subtle"> / 100</span>}
        </p>
        <p className="mt-0.5 text-xs text-ink-subtle">Ambang {item.passingScore}</p>
      </Cell>

      <TimeCell item={item} />

      <div className="col-span-2 flex items-center sm:col-span-3 lg:col-span-1 lg:justify-end">
        <Link
          href={PATHS.adminReview(item.id)}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-3 focus-visible:after:ring-brand/30"
        >
          Lihat
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          <span className="sr-only">
            : {item.memberName}, {item.caseTitle}
          </span>
        </Link>
      </div>
    </div>
  );
}
