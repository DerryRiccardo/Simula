import { Building2, Star } from 'lucide-react';

import { TierBadge } from '@/components/student';
import { CASE_LEVEL_LABEL } from '@/constants/caseLevel';
import { FIELD_BY_KEY } from '@/constants/fields';
import { formatNumber } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ICaseDetail } from '@/types';

// Judul ala dokumen: tanpa blok warna, fakta utama dalam satu strip bersekat garis.
export function CaseHeader({ detail }: { detail: ICaseDetail }) {
  const field = FIELD_BY_KEY[detail.fieldKey];
  const FieldIcon = field?.icon;
  const isAi = detail.tier === 'ai';

  const facts = [
    { label: 'Durasi', value: detail.durationLabel },
    { label: 'Deliverable', value: String(detail.deliverableCount) },
    { label: 'Level', value: CASE_LEVEL_LABEL[detail.level] },
    { label: 'Peserta', value: formatNumber(detail.participantCount) },
  ];

  return (
    <header>
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className={cn(
            'grid size-8 place-items-center rounded-control',
            isAi ? 'bg-ai-soft text-ai' : 'bg-brand-soft text-brand'
          )}
          aria-hidden="true"
        >
          {FieldIcon && <FieldIcon className="size-4" strokeWidth={1.75} />}
        </span>
        <span className="text-sm text-ink-muted">{field?.label}</span>
        <TierBadge tier={detail.tier} />
      </div>

      <h1 className="mt-5 max-w-3xl text-[1.875rem] leading-[1.15] tracking-[-0.025em] text-balance md:text-[2.5rem]">
        {detail.title}
      </h1>
      <p className="mt-3 max-w-[60ch] text-[0.9375rem] leading-relaxed text-pretty text-ink-muted md:text-base">
        {detail.summary}
      </p>

      {detail.partner && (
        <p className="mt-4 flex items-center gap-2 text-sm text-ink-muted">
          <Building2 className="size-4 text-ink-subtle" strokeWidth={1.75} />
          Brief dari <span className="font-medium text-ink">{detail.partner.name}</span>
          <span className="text-ink-subtle">({detail.partner.industry})</span>
        </p>
      )}

      <dl className="mt-8 grid grid-cols-2 gap-y-5 border-y border-line py-5 sm:grid-cols-5 sm:divide-x sm:divide-line">
        {facts.map((fact) => (
          <div key={fact.label} className="sm:px-5 sm:first:pl-0">
            <dt className="text-xs text-ink-subtle">{fact.label}</dt>
            <dd className="mt-1 font-mono text-sm text-ink tabular-nums">{fact.value}</dd>
          </div>
        ))}
        <div className="sm:px-5">
          <dt className="text-xs text-ink-subtle">Rating</dt>
          <dd className="mt-1 flex items-center gap-1 font-mono text-sm text-ink tabular-nums">
            <Star className="size-3.5 fill-ink text-ink" />
            {detail.rating.toLocaleString('id-ID')}
          </dd>
        </div>
      </dl>
    </header>
  );
}
