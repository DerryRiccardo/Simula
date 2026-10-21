import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { CASE_LEVEL_LABEL } from '@/constants/caseLevel';
import { FIELD_BY_KEY } from '@/constants/fields';
import { PATHS } from '@/constants/paths';
import { formatDate, formatNumber } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { IAdminCaseSummary } from '@/types';
import { CaseStatusBadge } from '@/components/admin';

// Kolom tabel hanya di layar lebar; di bawahnya angka dan aksi turun ke bawah judul.
export const ADMIN_CASE_GRID =
  'lg:grid lg:grid-cols-[minmax(0,1fr)_6rem_8rem_8rem_4rem] lg:items-center lg:gap-6';

const TIER_LABEL = { ai: 'AI Case Study', b2b: 'B2B Case Study' } as const;

export function AdminCaseRow({ item }: { item: IAdminCaseSummary }) {
  const field = FIELD_BY_KEY[item.fieldKey];
  const FieldIcon = field?.icon;
  const isAi = item.tier === 'ai';

  return (
    <div
      className={cn(
        'group relative grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 transition-colors duration-200 hover:bg-surface-soft/70',
        ADMIN_CASE_GRID
      )}
    >
      <div className="col-span-2 flex min-w-0 items-start gap-3.5 lg:col-span-1">
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-control',
            isAi ? 'bg-ai-soft text-ai' : 'bg-brand-soft text-brand'
          )}
          aria-hidden="true"
        >
          {FieldIcon && <FieldIcon className="size-[1.0625rem]" strokeWidth={1.75} />}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm leading-snug font-semibold text-pretty md:text-sm lg:truncate">
            {item.title || 'Tanpa judul'}
          </h3>
          <p className="mt-0.5 truncate text-xs text-ink-subtle">
            <span className={isAi ? 'text-ai' : 'text-brand'}>{TIER_LABEL[item.tier]}</span>
            {field && <> / {field.label}</>} / {CASE_LEVEL_LABEL[item.level]}
            {item.partnerName && <> / {item.partnerName}</>}
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs text-ink-subtle lg:hidden">Status</p>
        <CaseStatusBadge status={item.status} />
      </div>
      <div>
        <p className="text-xs text-ink-subtle lg:hidden">Peserta</p>
        <p className="font-mono text-[0.8125rem] text-ink tabular-nums">
          {formatNumber(item.participantCount)}
        </p>
        {item.pendingReviewCount > 0 && (
          <p className="text-xs font-medium text-brand">
            {item.pendingReviewCount} menunggu review
          </p>
        )}
      </div>
      <div>
        <p className="text-xs text-ink-subtle lg:hidden">Diubah</p>
        <p className="font-mono text-[0.8125rem] text-ink-muted tabular-nums">
          {formatDate(item.updatedAt)}
        </p>
      </div>
      <div className="lg:text-right">
        <Link
          href={PATHS.adminCaseEdit(item.id)}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-3 focus-visible:after:ring-brand/30"
        >
          Edit
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          <span className="sr-only">: {item.title}</span>
        </Link>
      </div>
    </div>
  );
}
