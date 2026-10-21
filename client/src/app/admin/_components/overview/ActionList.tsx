import Link from 'next/link';
import {
  AlarmClock,
  ChevronRight,
  CircleCheck,
  CreditCard,
  FilePen,
  Hourglass,
  UserRoundX,
  type LucideIcon,
} from 'lucide-react';

import { EmptyState } from '@/components';
import { PATHS } from '@/constants/paths';
import {
  formatBusinessDaysLeft,
  formatDeadline,
  formatRelative,
  formatTimeLeft,
} from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { IAdminActionItem, TAdminActionKind } from '@/types';

interface IActionMeta {
  title: string;
  icon: LucideIcon;
  /** Terlambat: ikon dan waktu berwarna biru, sama dengan tag "butuh tindakan". */
  isUrgent: boolean;
  getTime: (at: string) => string;
  getHref: (item: IAdminActionItem) => string;
}

const reviewHref = (item: IAdminActionItem) =>
  item.enrollmentId ? PATHS.adminReview(item.enrollmentId) : `${PATHS.adminReviews}?tier=b2b`;

const ACTION_META: Record<TAdminActionKind, IActionMeta> = {
  review_overdue: {
    title: 'Review melewati SLA',
    icon: AlarmClock,
    isUrgent: true,
    getTime: formatDeadline,
    getHref: reviewHref,
  },
  review_due_soon: {
    title: 'Review mendekati batas SLA',
    icon: Hourglass,
    isUrgent: false,
    getTime: formatBusinessDaysLeft,
    getHref: reviewHref,
  },
  payment_expiring: {
    title: 'Pembayaran hampir kedaluwarsa',
    icon: CreditCard,
    isUrgent: false,
    getTime: (at) => `Sisa ${formatTimeLeft(at)}`,
    getHref: () => PATHS.adminOrders,
  },
  case_without_reviewer: {
    title: 'B2B case tanpa reviewer aktif',
    icon: UserRoundX,
    isUrgent: true,
    getTime: () => 'Belum ditugaskan',
    // Bagian Komersial punya tautan "Tugaskan reviewer" yang sudah tersaring ke mitra case.
    getHref: (item) => `${PATHS.adminCaseEdit(item.caseId)}#commercial`,
  },
  draft_stale: {
    title: 'Draft lama belum terbit',
    icon: FilePen,
    isUrgent: false,
    getTime: (at) => `Diubah ${formatRelative(at)}`,
    getHref: (item) => PATHS.adminCaseEdit(item.caseId),
  },
};

function getContext(item: IAdminActionItem) {
  const who = item.partnerName ? `${item.memberName} untuk ${item.partnerName}` : item.memberName;
  return who ? `${who}, ${item.caseTitle}` : item.caseTitle;
}

function ActionRow({ item }: { item: IAdminActionItem }) {
  const meta = ACTION_META[item.kind];
  const Icon = meta.icon;
  return (
    <Link
      href={meta.getHref(item)}
      className="group flex items-center gap-4 px-5 py-4 transition-colors duration-200 outline-none hover:bg-surface-soft/70 focus-visible:bg-surface-soft"
    >
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-control border',
          meta.isUrgent
            ? 'border-brand-muted bg-brand-soft text-brand'
            : 'border-line bg-surface-soft text-ink-muted'
        )}
        aria-hidden="true"
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="text-sm font-medium text-ink">{meta.title}</span>
          <span
            className={cn(
              'text-xs whitespace-nowrap tabular-nums',
              meta.isUrgent ? 'font-semibold text-brand' : 'text-ink-subtle'
            )}
          >
            {meta.getTime(item.at)}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-[0.8125rem] text-ink-muted">
          {getContext(item)}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-ink-subtle transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}

// "Perlu tindakan" (CONTEXT.md 4.13): setiap butir langsung menautkan ke halaman terkait.
export function ActionList({ items }: { items: IAdminActionItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={CircleCheck}
        title="Tidak ada yang perlu ditindaklanjuti"
        description="Review B2B masih dalam SLA, tidak ada pembayaran yang hampir kedaluwarsa, dan tidak ada draft yang terbengkalai."
      />
    );
  }
  return (
    <ol className="divide-y divide-line overflow-hidden rounded-card border border-line bg-white">
      {items.map((item) => (
        <li key={item.id}>
          <ActionRow item={item} />
        </li>
      ))}
    </ol>
  );
}
