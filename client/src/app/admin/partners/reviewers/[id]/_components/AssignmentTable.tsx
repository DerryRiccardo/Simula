import { Loader2 } from 'lucide-react';

import { CaseStatusBadge } from '@/components/admin';
import { Button } from '@/components/ui';
import { FIELD_BY_KEY } from '@/constants/fields';
import { formatPrice } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { IAdminPartnerCase } from '@/types';

// Kolom tabel di layar lebar; di bawahnya status, harga, dan reviewer turun ke bawah judul.
const ASSIGNMENT_GRID =
  'lg:grid lg:grid-cols-[minmax(0,1fr)_6rem_7.5rem_8rem_7rem] lg:items-center lg:gap-5';

interface AssignmentTableProps {
  items: IAdminPartnerCase[];
  isAssigned: (item: IAdminPartnerCase) => boolean;
  /** Case yang sedang diproses; tombolnya menampilkan loading. */
  pendingCaseId: string | null;
  isDisabled: boolean;
  onToggle: (item: IAdminPartnerCase, isAssigned: boolean) => void;
}

// Satu baris per B2B case milik mitra reviewer, dengan tombol Assign atau Lepas.
export function AssignmentTable({
  items,
  isAssigned,
  pendingCaseId,
  isDisabled,
  onToggle,
}: AssignmentTableProps) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-white">
      <div
        className={cn(
          'hidden border-b border-line bg-surface-soft/60 px-5 py-2.5 text-xs font-medium text-ink-subtle',
          ASSIGNMENT_GRID
        )}
        aria-hidden="true"
      >
        <span>Case</span>
        <span>Status</span>
        <span>Harga</span>
        <span>Reviewer aktif</span>
        <span className="text-right">Penugasan</span>
      </div>
      <ul className="divide-y divide-line">
        {items.map((item) => {
          const field = FIELD_BY_KEY[item.fieldKey];
          const FieldIcon = field?.icon;
          const assigned = isAssigned(item);
          const isPending = pendingCaseId === item.id;
          return (
            <li
              key={item.id}
              className={cn(
                'grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-3',
                ASSIGNMENT_GRID,
                assigned && 'bg-brand-soft/30'
              )}
            >
              <div className="col-span-2 flex min-w-0 items-center gap-3.5 sm:col-span-3 lg:col-span-1">
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-control bg-brand-soft text-brand"
                  aria-hidden="true"
                >
                  {FieldIcon && <FieldIcon className="size-[1.0625rem]" strokeWidth={1.75} />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm leading-snug font-medium text-pretty text-ink lg:truncate">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-subtle">{field?.label ?? 'B2B Case'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-ink-subtle lg:hidden">Status</p>
                <CaseStatusBadge status={item.status} />
              </div>
              <div>
                <p className="text-xs text-ink-subtle lg:hidden">Harga</p>
                <p className="font-mono text-[0.8125rem] text-ink tabular-nums">
                  {formatPrice(item.price || null)}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-subtle lg:hidden">Reviewer aktif</p>
                <p
                  className={cn(
                    'font-mono text-[0.8125rem] tabular-nums',
                    item.activeReviewerCount === 0 ? 'font-semibold text-brand' : 'text-ink'
                  )}
                >
                  {item.activeReviewerCount === 0 ? 'Belum ada' : item.activeReviewerCount}
                </p>
                <p className="mt-0.5 text-xs text-ink-subtle">{item.pendingReviewCount} antrean</p>
              </div>
              <div className="col-span-2 sm:col-span-3 lg:col-span-1 lg:text-right">
                <Button
                  size="pill"
                  variant={assigned ? 'outline' : 'default'}
                  disabled={isDisabled || isPending}
                  onClick={() => onToggle(item, !assigned)}
                  className="w-full min-w-[6.5rem] sm:w-auto"
                >
                  {isPending && <Loader2 className="animate-spin" />}
                  {assigned ? 'Lepas' : 'Assign'}
                  <span className="sr-only">: {item.title}</span>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
