'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import { OrderStatusBadge } from '@/components/admin';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { PAYMENT_METHOD_BY_VALUE } from '@/constants/payment';
import { formatDateTime, formatPrice } from '@/lib/formatters';
import type { IAdminOrder } from '@/types';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-2.5 text-sm">
      <dt className="text-ink-subtle">{label}</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </div>
  );
}

interface OrderSheetProps {
  order: IAdminOrder | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

// Rincian satu order. Baca saja: status mengikuti notifikasi payment gateway (CONTEXT.md 7).
export function OrderSheet({ order, isOpen, onOpenChange }: OrderSheetProps) {
  const method = order ? PAYMENT_METHOD_BY_VALUE[order.method] : null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
        {order && (
          <>
            <div className="border-b border-line px-6 pt-6 pb-5">
              <OrderStatusBadge status={order.status} />
              <SheetTitle className="mt-3 font-mono text-base font-medium text-ink">
                {order.invoiceNumber}
              </SheetTitle>
              <SheetDescription className="mt-1 text-sm text-ink-muted">
                Dibuat {formatDateTime(order.createdAt)}
              </SheetDescription>
              <p className="mt-5 text-[2rem] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums">
                {formatPrice(order.total)}
              </p>
            </div>

            <dl className="divide-y divide-line px-6 py-2">
              <Row label="Member">
                <Link
                  href={PATHS.adminMember(order.memberId)}
                  className="font-medium text-brand hover:underline"
                >
                  {order.memberName}
                </Link>
                <span className="block truncate text-xs text-ink-subtle">{order.memberEmail}</span>
              </Row>
              <Row label="Case">
                {order.caseTitle}
                {order.partnerName && (
                  <span className="block text-xs text-ink-subtle">{order.partnerName}</span>
                )}
              </Row>
              <Row label="Metode">{method?.label ?? order.method}</Row>
              {order.vaNumber && (
                <Row label="Nomor VA">
                  <span className="font-mono tabular-nums">{order.vaNumber}</span>
                </Row>
              )}
            </dl>

            <dl className="mx-6 my-2 rounded-control bg-surface-soft/70 px-4 py-1">
              <Row label="Harga case">
                <span className="font-mono tabular-nums">{formatPrice(order.subtotal)}</span>
              </Row>
              <Row label="Biaya admin">
                <span className="font-mono tabular-nums">
                  {order.adminFee > 0 ? formatPrice(order.adminFee) : 'Rp 0'}
                </span>
              </Row>
              <Row label="Total">
                <span className="font-mono font-semibold tabular-nums">
                  {formatPrice(order.total)}
                </span>
              </Row>
            </dl>

            <dl className="divide-y divide-line px-6 py-2">
              <Row label="Batas bayar">
                <span className="font-mono tabular-nums">{formatDateTime(order.expiresAt)}</span>
              </Row>
              <Row label="Dibayar">
                <span className="font-mono tabular-nums">
                  {order.paidAt ? formatDateTime(order.paidAt) : '-'}
                </span>
              </Row>
            </dl>

            <p className="mx-6 mt-2 mb-6 border-t border-line pt-4 text-xs leading-relaxed text-ink-subtle">
              Status order mengikuti notifikasi payment gateway dan tidak diubah manual dari panel
              admin. Refund belum tersedia di MVP.
            </p>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
