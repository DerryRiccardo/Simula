import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

import { OrderStatusBadge } from '@/components/admin';
import { PAYMENT_METHOD_BY_VALUE } from '@/constants/payment';
import { formatDate, formatPrice, formatTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { IAdminOrder } from '@/types';

// Kolom tabel di layar lebar; di bawahnya nominal dan status turun ke bawah invoice.
const ORDER_GRID =
  'lg:grid lg:grid-cols-[10.5rem_minmax(0,1fr)_minmax(0,1fr)_7.5rem_7rem_6.5rem] lg:items-center lg:gap-5';

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-ink-subtle lg:hidden">{label}</p>
      {children}
    </div>
  );
}

/** "BCA Virtual Account" → "BCA VA", agar muat di kolom tabel. */
const getShortMethodLabel = (method: IAdminOrder['method']) =>
  (PAYMENT_METHOD_BY_VALUE[method]?.label ?? method).replace(' Virtual Account', ' VA');

interface OrderTableProps {
  items: IAdminOrder[];
  onSelect: (order: IAdminOrder) => void;
}

// Satu baris per order; seluruh baris membuka panel rincian.
export function OrderTable({ items, onSelect }: OrderTableProps) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-white">
      <div
        className={cn(
          'hidden border-b border-line bg-surface-soft/60 px-5 py-2.5 text-xs font-medium text-ink-subtle',
          ORDER_GRID
        )}
        aria-hidden="true"
      >
        <span>Invoice</span>
        <span>Member</span>
        <span>Case</span>
        <span>Metode</span>
        <span className="text-right">Total</span>
        <span className="text-right">Status</span>
      </div>
      <ul className="divide-y divide-line">
        {items.map((order) => (
          <li key={order.id}>
            <button
              type="button"
              onClick={() => onSelect(order)}
              className={cn(
                'group grid w-full grid-cols-2 gap-4 px-5 py-4 text-left transition-colors duration-200 outline-none hover:bg-surface-soft/70 focus-visible:bg-surface-soft',
                ORDER_GRID
              )}
            >
              <div className="col-span-2 flex min-w-0 items-baseline justify-between gap-3 lg:col-span-1 lg:block">
                <p className="truncate font-mono text-[0.8125rem] font-medium text-ink">
                  {order.invoiceNumber}
                </p>
                <p className="shrink-0 font-mono text-xs text-ink-subtle tabular-nums">
                  {formatDate(order.createdAt)}, {formatTime(order.createdAt)}
                </p>
              </div>
              <Cell label="Member">
                <p className="truncate text-sm text-ink">{order.memberName}</p>
                <p className="truncate text-xs text-ink-subtle">{order.memberEmail}</p>
              </Cell>
              <Cell label="Case">
                <p className="truncate text-sm text-ink">{order.caseTitle}</p>
                {order.partnerName && (
                  <p className="truncate text-xs text-ink-subtle">{order.partnerName}</p>
                )}
              </Cell>
              <Cell label="Metode">
                <p className="truncate text-[0.8125rem] text-ink-muted">
                  {getShortMethodLabel(order.method)}
                </p>
              </Cell>
              <Cell label="Total">
                <p className="font-mono text-[0.8125rem] text-ink tabular-nums lg:text-right">
                  {formatPrice(order.total)}
                </p>
              </Cell>
              <div className="col-span-2 flex items-center justify-between gap-2 lg:col-span-1 lg:justify-end">
                <OrderStatusBadge status={order.status} />
                <ChevronRight className="size-4 shrink-0 text-ink-subtle transition-transform duration-200 group-hover:translate-x-0.5" />
                <span className="sr-only">Lihat rincian {order.invoiceNumber}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
