import Link from 'next/link';
import { FolderKanban, Power, PowerOff } from 'lucide-react';

import { Button } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { getInitials } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { IAdminPartnerCase, IAdminReviewer } from '@/types';

interface ReviewerListProps {
  reviewers: IAdminReviewer[];
  cases: IAdminPartnerCase[];
  onToggleStatus: (reviewer: IAdminReviewer) => void;
}

const formatDays = (days: number | null) =>
  days === null ? '-' : `${days.toLocaleString('id-ID')} hari`;

// Satu baris per reviewer: mitra dan jabatan, case yang dinilai, beban kerja, dan kecepatan review.
export function ReviewerList({ reviewers, cases, onToggleStatus }: ReviewerListProps) {
  const caseTitle = (id: string) => cases.find((item) => item.id === id)?.title ?? id;

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-white">
      {reviewers.map((reviewer) => (
        <li
          key={reviewer.id}
          className={cn(
            'grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_15rem_auto] lg:items-center lg:gap-6',
            !reviewer.isActive && 'bg-surface-soft/50'
          )}
        >
          <div className="flex min-w-0 items-start gap-3.5">
            <span
              className={cn(
                'grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold',
                reviewer.isActive ? 'bg-ink text-white' : 'bg-line text-ink-muted'
              )}
              aria-hidden="true"
            >
              {getInitials(reviewer.name)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Link
                  href={PATHS.adminReviewerAssignments(reviewer.id)}
                  className="text-sm font-semibold text-ink underline-offset-4 hover:underline"
                >
                  {reviewer.name}
                </Link>
                {!reviewer.isActive && (
                  <span className="rounded-tag bg-white px-1.5 py-px text-[0.6875rem] font-medium text-ink-muted ring-1 ring-line ring-inset">
                    Nonaktif
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-[0.8125rem] text-ink-muted">
                {reviewer.jobTitle}, {reviewer.partnerName}
              </p>
              <p className="truncate text-xs text-ink-subtle">{reviewer.email}</p>
              {reviewer.caseIds.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {reviewer.caseIds.map((id) => (
                    <li
                      key={id}
                      className="max-w-full truncate rounded-tag border border-line bg-white px-2 py-0.5 text-xs text-ink-muted"
                    >
                      {caseTitle(id)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-ink-subtle">Belum ditugaskan ke case mana pun.</p>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-4">
            <div>
              <dt className="text-xs text-ink-subtle">Menunggu</dt>
              <dd className="mt-0.5 font-mono text-sm text-ink tabular-nums">
                {reviewer.pendingCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-subtle">Diputuskan</dt>
              <dd className="mt-0.5 font-mono text-sm text-ink tabular-nums">
                {reviewer.decidedCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-subtle">Rata-rata</dt>
              <dd className="mt-0.5 font-mono text-sm text-ink tabular-nums">
                {formatDays(reviewer.averageReviewDays)}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button asChild variant="outline" size="pill">
              <Link href={PATHS.adminReviewerAssignments(reviewer.id)}>
                <FolderKanban className="size-3.5" />
                Atur penugasan
                <span className="sr-only"> untuk {reviewer.name}</span>
              </Link>
            </Button>
            <Button variant="ghost" size="pill" onClick={() => onToggleStatus(reviewer)}>
              {reviewer.isActive ? (
                <PowerOff className="size-3.5" />
              ) : (
                <Power className="size-3.5" />
              )}
              {reviewer.isActive ? 'Nonaktifkan' : 'Aktifkan'}
              <span className="sr-only"> {reviewer.name}</span>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
