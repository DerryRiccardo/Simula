import type { ReactNode } from 'react';

import { StatusBadge, TierBadge } from '@/components/student';
import { FIELD_BY_KEY } from '@/constants/fields';
import { formatDate, formatTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { IAdminReviewDetail } from '@/types';
import { ADMIN_REVIEW_STATUS } from '@/app/admin/reviews/_components/reviewMeta';

interface FactProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** Angka dan tanggal memakai huruf mono; nama memakai huruf biasa. */
  isMono?: boolean;
}

function Fact({ label, value, hint, isMono = true }: FactProps) {
  return (
    <div className="min-w-0 bg-white px-4 py-3">
      <dt className="text-xs text-ink-subtle">{label}</dt>
      <dd
        className={cn(
          'mt-0.5 truncate text-[0.8125rem] font-medium text-ink',
          isMono && 'font-mono tabular-nums'
        )}
      >
        {value}
      </dd>
      {hint && <dd className="mt-0.5 truncate text-xs text-ink-muted">{hint}</dd>}
    </div>
  );
}

interface DetailHeaderProps {
  detail: IAdminReviewDetail;
  actions: ReactNode;
}

// Identitas peserta (terlihat oleh admin), case yang dinilai, siapa penilainya, dan aksi admin.
export function DetailHeader({ detail, actions }: DetailHeaderProps) {
  const { item, caseInfo } = detail;
  const status = ADMIN_REVIEW_STATUS[item.status];
  const field = FIELD_BY_KEY[caseInfo.fieldKey];
  const assessor =
    item.tier === 'ai'
      ? 'Penilai AI'
      : [item.reviewerName, item.reviewerRole].filter(Boolean).join(', ');

  return (
    <header className="grid gap-6 border-b border-line pb-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <TierBadge tier={item.tier} />
            <StatusBadge status={item.status} label={status.label} tone={status.tone} />
          </div>
          <h1 className="mt-3 text-[1.625rem] leading-[1.2] tracking-[-0.02em] text-balance md:text-[2rem]">
            {item.memberName}
          </h1>
          <p className="mt-1 text-sm break-all text-ink-muted">{item.memberEmail}</p>
        </div>
        <div className="shrink-0">{actions}</div>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-4">
        <div className="col-span-2 min-w-0 bg-white px-4 py-3">
          <dt className="text-xs text-ink-subtle">Case</dt>
          <dd className="mt-0.5 truncate text-[0.8125rem] font-medium text-ink">
            {caseInfo.title}
          </dd>
          <dd className="mt-0.5 truncate text-xs text-ink-muted">
            {[caseInfo.partner?.name, field?.label].filter(Boolean).join(' / ')}
          </dd>
        </div>
        <Fact
          label="Dikirim"
          value={formatDate(item.submittedAt)}
          hint={`Pukul ${formatTime(item.submittedAt)}, percobaan ${item.attempt}`}
        />
        <Fact
          label="Dinilai oleh"
          value={assessor || '-'}
          hint={`Ambang lulus ${item.passingScore}`}
          isMono={false}
        />
      </dl>
    </header>
  );
}
