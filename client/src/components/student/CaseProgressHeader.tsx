import { StatusBadge, TierBadge } from './Badges';
import { FIELD_BY_KEY } from '@/constants/fields';
import type { ICaseDetail, IEnrollment } from '@/types';

interface CaseProgressHeaderProps {
  caseInfo: ICaseDetail;
  enrollment: IEnrollment;
}

// Header halaman pengerjaan dan status: tier, status, judul case, dan mitra.
export function CaseProgressHeader({ caseInfo, enrollment }: CaseProgressHeaderProps) {
  const field = FIELD_BY_KEY[caseInfo.fieldKey];

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
    </header>
  );
}
