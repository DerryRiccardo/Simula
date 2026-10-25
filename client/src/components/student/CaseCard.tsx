import Link from 'next/link';
import { ArrowUpRight, Building2, Star } from 'lucide-react';

import { CASE_LEVEL_LABEL } from '@/constants/caseLevel';
import { FIELD_BY_KEY } from '@/constants/fields';
import { PATHS } from '@/constants/paths';
import { formatNumber, formatPrice } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ICaseSummary } from '@/types';
import { TierBadge } from './Badges';

interface CaseCardProps {
  item: ICaseSummary;
  isRecommended?: boolean;
}

// Kartu datar: tanpa header berwarna. Warna tier hanya di ikon, tag, dan harga.
export function CaseCard({ item, isRecommended = false }: CaseCardProps) {
  const field = FIELD_BY_KEY[item.fieldKey];
  const FieldIcon = field?.icon;
  const isAi = item.tier === 'ai';

  return (
    <article className="group relative flex h-full flex-col rounded-card border border-line bg-white p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-ink/15 hover:shadow-lift">
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-control',
            isAi ? 'bg-ai-soft text-ai' : 'bg-brand-soft text-brand'
          )}
          aria-hidden="true"
        >
          {FieldIcon && <FieldIcon className="size-[1.0625rem]" strokeWidth={1.75} />}
        </span>
        <div className="flex flex-wrap justify-end gap-1.5">
          {isRecommended && (
            <span className="inline-flex items-center rounded-tag bg-surface-soft px-2 py-0.5 text-[0.6875rem] leading-5 font-medium text-ink">
              Cocok untukmu
            </span>
          )}
          <TierBadge tier={item.tier} />
        </div>
      </div>

      <p className="mt-4 text-xs text-ink-subtle">
        {field?.label} <span aria-hidden="true">/</span> {CASE_LEVEL_LABEL[item.level]}
      </p>
      <h3 className="mt-1 line-clamp-2 text-[0.9375rem] leading-snug font-semibold text-balance md:text-[0.9375rem]">
        {item.title}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-muted">{item.summary}</p>

      {item.partnerName && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
          <Building2 className="size-3.5 text-ink-subtle" strokeWidth={1.75} />
          {item.partnerName}
        </p>
      )}

      {/* Info dan footer selalu menempel di bawah dengan jarak tetap; ruang sisa ada di atasnya. */}
      <div className="mt-auto pt-4">
        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[0.6875rem] whitespace-nowrap text-ink-subtle tabular-nums">
          <div>
            <dt className="sr-only">Durasi</dt>
            <dd>{item.durationLabel}</dd>
          </div>
          {/* Rating 0 berarti belum ada peserta yang menilai; disembunyikan agar tidak terbaca jelek. */}
          {item.rating > 0 && (
            <div>
              <dt className="sr-only">Rating</dt>
              <dd className="flex items-center gap-1">
                <Star className="size-3 fill-ink-subtle text-ink-subtle" />
                {item.rating.toLocaleString('id-ID')}
              </dd>
            </div>
          )}
          <div>
            <dt className="sr-only">Peserta</dt>
            <dd>{formatNumber(item.participantCount)} peserta</dd>
          </div>
        </dl>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
          <p className={cn('text-sm font-semibold tabular-nums', isAi ? 'text-ai' : 'text-ink')}>
            {formatPrice(item.price)}
          </p>
          {/* Seluruh kartu bisa diklik lewat pseudo-element pada tautan ini. */}
          <Link
            href={PATHS.caseDetail(item.slug)}
            className="flex items-center gap-1 text-sm font-medium text-brand outline-none after:absolute after:inset-0 after:rounded-card after:content-[''] focus-visible:after:ring-3 focus-visible:after:ring-brand/30"
          >
            Lihat detail
            <ArrowUpRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            <span className="sr-only">: {item.title}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
