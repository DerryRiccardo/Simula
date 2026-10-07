import type { ReactNode } from 'react';

import { formatBusinessDaysLeft, formatDate, formatTime } from '@/lib/formatters';
import type { ICaseStatus } from '@/types';

function Fact({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="bg-white p-4">
      <dt className="text-xs text-ink-subtle">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-ink-muted">{hint}</dd>}
    </div>
  );
}

// Pernyataan status utama: siapa yang menilai, kapan dikirim, dan kapan hasil paling lambat keluar.
export function ReviewOverview({ status }: { status: ICaseStatus }) {
  const { caseInfo, submission, reviewDueAt } = status;
  const reviewer = caseInfo.reviewerRole ?? 'Reviewer mitra';

  return (
    <section aria-labelledby="review-title">
      <h2
        id="review-title"
        className="text-[1.375rem] leading-tight tracking-[-0.02em] md:text-[1.5rem]"
      >
        Submission-mu sedang direview
      </h2>
      <p className="mt-2 max-w-[62ch] text-[0.9375rem] leading-relaxed text-pretty text-ink-muted">
        {reviewer}
        {caseInfo.partner && <> dari {caseInfo.partner.name}</>} menilai hasil kerjamu dengan rubrik
        case ini. Selama review, identitasmu disamarkan sebagai kandidat anonim.
      </p>

      <dl className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
        <Fact
          label="Dikirim"
          value={
            submission ? (
              <span className="font-mono tabular-nums">{formatDate(submission.submittedAt)}</span>
            ) : (
              '-'
            )
          }
          hint={
            submission && (
              <span className="font-mono tabular-nums">
                Pukul {formatTime(submission.submittedAt)}, percobaan {submission.attempt}
              </span>
            )
          }
        />
        <Fact
          label="Hasil paling lambat"
          value={
            reviewDueAt ? (
              <span className="font-mono tabular-nums">{formatDate(reviewDueAt)}</span>
            ) : (
              '-'
            )
          }
          hint={
            reviewDueAt && (
              <span className="font-mono font-medium text-brand tabular-nums">
                {formatBusinessDaysLeft(reviewDueAt)}
              </span>
            )
          }
        />
        <Fact label="Reviewer" value={reviewer} hint={caseInfo.partner?.name} />
      </dl>
    </section>
  );
}
