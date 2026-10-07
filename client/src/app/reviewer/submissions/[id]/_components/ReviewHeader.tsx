import type { ReactNode } from 'react';

import { FIELD_BY_KEY } from '@/constants/fields';
import { formatBusinessDaysLeft, formatDate, formatTime } from '@/lib/formatters';
import type { IReviewSubmissionDetail } from '@/types';

interface FactProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}

function Fact({ label, value, hint }: FactProps) {
  return (
    <div className="min-w-0 bg-white px-4 py-3">
      <dt className="text-xs text-ink-subtle">{label}</dt>
      <dd className="mt-0.5 font-mono text-[0.8125rem] font-medium text-ink tabular-nums">
        {value}
      </dd>
      {hint && <dd className="mt-0.5 text-xs text-ink-muted">{hint}</dd>}
    </div>
  );
}

// Identitas anonim kandidat, case yang dinilai, dan waktu penting (dikirim, SLA, percobaan).
export function ReviewHeader({ detail }: { detail: IReviewSubmissionDetail }) {
  const { item, caseInfo, maxRevisions } = detail;
  const field = FIELD_BY_KEY[caseInfo.fieldKey];
  const isPending = item.status === 'in_review';

  return (
    <header className="grid gap-6 border-b border-line pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div className="min-w-0">
        <p className="font-mono text-sm font-medium text-ink tabular-nums">{item.candidateLabel}</p>
        <h1 className="mt-2 max-w-3xl text-[1.625rem] leading-[1.2] tracking-[-0.02em] text-balance md:text-[2rem]">
          {caseInfo.title}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {caseInfo.partner?.name}
          {field && <> / {field.label}</>}, dinilai sebagai {caseInfo.reviewerRole}
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-card border border-line bg-line lg:w-[30rem]">
        <Fact
          label="Dikirim"
          value={formatDate(item.submittedAt)}
          hint={`Pukul ${formatTime(item.submittedAt)}`}
        />
        <Fact
          label="Tenggat review"
          value={formatDate(item.reviewDueAt)}
          hint={isPending ? formatBusinessDaysLeft(item.reviewDueAt) : 'Sudah diputuskan'}
        />
        <Fact
          label="Percobaan"
          value={item.attempt}
          hint={`${item.revisionCount} dari ${maxRevisions} revisi`}
        />
      </dl>
    </header>
  );
}
