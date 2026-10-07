import { differenceInCalendarDays } from 'date-fns';

import { StatusBadge, TierBadge } from './Badges';
import { FIELD_BY_KEY } from '@/constants/fields';
import { formatDate, formatDeadline } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ICaseDetail, IEnrollment, TEnrollmentStatus } from '@/types';

// Tenggat hanya relevan selama peserta masih mengerjakan; saat direview, waktunya milik reviewer.
const DEADLINE_STATUSES: TEnrollmentStatus[] = ['in_progress', 'revision_requested'];

interface CaseProgressHeaderProps {
  caseInfo: ICaseDetail;
  enrollment: IEnrollment;
}

// Header halaman pengerjaan dan status: tier, status, judul case, mitra, dan tenggat bila ada.
export function CaseProgressHeader({ caseInfo, enrollment }: CaseProgressHeaderProps) {
  const field = FIELD_BY_KEY[caseInfo.fieldKey];
  const deadlineAt = DEADLINE_STATUSES.includes(enrollment.status) ? enrollment.deadlineAt : null;
  const isUrgent = deadlineAt
    ? differenceInCalendarDays(new Date(deadlineAt), new Date()) <= 2
    : false;

  return (
    <header className="flex flex-col gap-5 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <TierBadge tier={caseInfo.tier} />
          <StatusBadge status={enrollment.status} />
          {field && <span className="text-sm text-ink-subtle">{field.label}</span>}
        </div>
        <h1 className="mt-3 max-w-3xl text-[1.625rem] leading-[1.2] tracking-[-0.02em] text-balance md:text-[2rem]">
          {caseInfo.title}
        </h1>
        {caseInfo.partner && (
          <p className="mt-2 text-sm text-ink-muted">
            Brief dari <span className="font-medium text-ink">{caseInfo.partner.name}</span>,
            direview oleh {caseInfo.reviewerRole}
          </p>
        )}
      </div>

      {deadlineAt && (
        <dl className="shrink-0 md:text-right">
          <dt className="text-xs text-ink-subtle">Tenggat</dt>
          <dd className="mt-0.5 font-mono text-sm text-ink tabular-nums">
            {formatDate(deadlineAt)}
          </dd>
          <dd
            className={cn(
              'font-mono text-xs tabular-nums',
              isUrgent ? 'font-semibold text-brand' : 'text-ink-muted'
            )}
          >
            {formatDeadline(deadlineAt)}
          </dd>
        </dl>
      )}
    </header>
  );
}
