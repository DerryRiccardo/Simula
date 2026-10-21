import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, Receipt, Sparkles } from 'lucide-react';

import { OrderStatusBadge } from '@/components/admin';
import { StatusBadge } from '@/components/student';
import { PATHS } from '@/constants/paths';
import { PAYMENT_METHOD_BY_VALUE } from '@/constants/payment';
import { formatDate, formatPrice, formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { IAdminMemberEnrollment, IAdminOrder } from '@/types';

function HistorySection({
  id,
  title,
  count,
  emptyText,
  children,
}: {
  id: string;
  title: string;
  count: number;
  emptyText: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="grid gap-3">
      <h2 id={id} className="flex items-baseline gap-2 text-lg tracking-[-0.01em] md:text-lg">
        {title}
        <span className="font-mono text-sm font-normal text-ink-subtle tabular-nums">{count}</span>
      </h2>
      {count === 0 ? (
        <p className="rounded-card border border-dashed border-line bg-white px-5 py-6 text-sm text-ink-muted">
          {emptyText}
        </p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-white">
          {children}
        </ul>
      )}
    </section>
  );
}

// Riwayat case member, terbaru dulu. Case yang sudah sampai penilaian menautkan ke detailnya.
export function EnrollmentHistory({ items }: { items: IAdminMemberEnrollment[] }) {
  return (
    <HistorySection
      id="member-cases"
      title="Riwayat case"
      count={items.length}
      emptyText="Member ini belum mengambil case apa pun."
    >
      {items.map((item) => {
        const TierIcon = item.tier === 'ai' ? Sparkles : Building2;
        return (
          <li key={item.id} className="flex items-start gap-3.5 px-5 py-4">
            <span
              className={cn(
                'grid size-9 shrink-0 place-items-center rounded-control',
                item.tier === 'ai' ? 'bg-ai-soft text-ai' : 'bg-brand-soft text-brand'
              )}
              aria-hidden="true"
            >
              <TierIcon className="size-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug font-medium text-pretty text-ink">
                {item.caseTitle}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <StatusBadge status={item.status} />
                {item.score !== null && (
                  <span className="font-mono text-xs text-ink tabular-nums">Skor {item.score}</span>
                )}
                <span className="text-xs text-ink-subtle">
                  {item.partnerName ? `${item.partnerName}, ` : ''}diperbarui{' '}
                  {formatRelative(item.updatedAt)}
                </span>
              </div>
            </div>
            {item.hasReview && (
              <Link
                href={PATHS.adminReview(item.id)}
                className="group inline-flex shrink-0 items-center gap-1 self-center text-sm font-medium text-brand"
              >
                Penilaian
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                <span className="sr-only">: {item.caseTitle}</span>
              </Link>
            )}
          </li>
        );
      })}
    </HistorySection>
  );
}

// Order member dari payment gateway; menautkan ke menu Order yang sudah difilter ke invoice itu.
export function OrderHistory({ items }: { items: IAdminOrder[] }) {
  return (
    <HistorySection
      id="member-orders"
      title="Order"
      count={items.length}
      emptyText="Belum ada transaksi. AI Case Study gratis, jadi order hanya muncul untuk B2B case."
    >
      {items.map((order) => (
        <li key={order.id}>
          <Link
            href={`${PATHS.adminOrders}?period=all&search=${encodeURIComponent(order.invoiceNumber)}`}
            className="group flex items-center gap-3.5 px-5 py-4 transition-colors hover:bg-surface-soft/70"
          >
            <span
              className="grid size-9 shrink-0 place-items-center rounded-control bg-surface-soft text-ink-muted"
              aria-hidden="true"
            >
              <Receipt className="size-4" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{order.caseTitle}</span>
              <span className="mt-0.5 block truncate font-mono text-xs text-ink-subtle">
                {order.invoiceNumber}, {PAYMENT_METHOD_BY_VALUE[order.method]?.label}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-mono text-sm text-ink tabular-nums">
                {formatPrice(order.total)}
              </span>
              <span className="mt-1 flex items-center justify-end gap-2">
                <span className="hidden font-mono text-xs text-ink-subtle sm:inline">
                  {formatDate(order.createdAt)}
                </span>
                <OrderStatusBadge status={order.status} />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </HistorySection>
  );
}
