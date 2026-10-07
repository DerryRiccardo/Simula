'use client';

import { useState } from 'react';
import { Copy, FlaskConical, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components';
import { StatusBadge } from '@/components/student';
import { Button } from '@/components/ui';
import { PAYMENT_METHOD_BY_VALUE } from '@/constants/payment';
import { useCancelOrder, useCheckout, useSimulatePayment } from '@/hooks/useCheckout';
import { formatDateTime, formatPrice, formatTimeLeft } from '@/lib/formatters';
import type { ICheckoutSummary, IOrder } from '@/types';
import { OrderSummary } from './OrderSummary';

// PLACEHOLDER: langkah transfer umum. Gunakan instruksi resmi dari payment gateway.
const TRANSFER_STEPS = [
  'Buka aplikasi mobile banking atau ATM bank yang dipilih.',
  'Pilih menu Transfer, lalu Virtual Account.',
  'Masukkan nomor virtual account di atas.',
  'Pastikan nama tujuan dan total sesuai, lalu konfirmasi.',
];

interface PendingPaymentProps {
  slug: string;
  summary: ICheckoutSummary;
  order: IOrder;
}

export function PendingPayment({ slug, summary, order }: PendingPaymentProps) {
  const method = PAYMENT_METHOD_BY_VALUE[order.method];
  const { refetch, isFetching } = useCheckout(slug);
  const cancelOrder = useCancelOrder();
  const simulate = useSimulatePayment(slug);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const vaDigits = order.vaNumber?.replace(/\s/g, '') ?? '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(vaDigits);
      toast.success('Nomor virtual account disalin');
    } catch {
      toast.error('Gagal menyalin. Salin nomornya secara manual.');
    }
  };

  // Di produksi status berubah lewat webhook gateway; tombol ini hanya memuat ulang data.
  const handleCheckStatus = async () => {
    const { data } = await refetch();
    if (data?.order?.status === 'awaiting_payment') {
      toast.info('Pembayaran belum diterima', {
        description: 'Status diperbarui otomatis beberapa menit setelah transfer.',
      });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
      <div className="grid content-start gap-8">
        <section aria-labelledby="va-title" className="rounded-card border border-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <h2 id="va-title" className="text-sm md:text-sm">
              {method.label}
            </h2>
            <StatusBadge status="pending_payment" />
          </div>

          <div className="grid gap-6 p-5">
            <div>
              <p className="text-xs text-ink-subtle">Nomor virtual account</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <p className="font-mono text-2xl tracking-[0.04em] text-ink tabular-nums">
                  {order.vaNumber}
                </p>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-tag border border-line px-2.5 py-1 text-xs font-medium text-ink-muted transition-colors outline-none hover:border-ink/25 hover:text-ink focus-visible:ring-3 focus-visible:ring-brand/30 active:scale-[0.97]"
                >
                  <Copy className="size-3.5" />
                  Salin
                </button>
              </div>
            </div>

            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-ink-subtle">Total transfer</dt>
                <dd className="mt-0.5 text-lg font-semibold tracking-[-0.02em] text-ink tabular-nums">
                  {formatPrice(order.total)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-subtle">Bayar sebelum</dt>
                <dd className="mt-0.5 font-mono text-sm text-ink tabular-nums">
                  {formatDateTime(order.expiresAt)}
                </dd>
                <dd className="font-mono text-xs font-semibold text-brand tabular-nums">
                  Sisa {formatTimeLeft(order.expiresAt)}
                </dd>
              </div>
            </dl>

            <div className="border-t border-line pt-5">
              <p className="text-sm font-medium text-ink">Cara membayar</p>
              <ol className="mt-3 grid gap-2.5">
                {TRANSFER_STEPS.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm text-ink-muted">
                    <span className="w-5 shrink-0 font-mono text-xs leading-5 text-ink-subtle tabular-nums">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-4">
            <Button variant="outline" size="pill" onClick={handleCheckStatus} disabled={isFetching}>
              {isFetching ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Cek status pembayaran
            </Button>
            <button
              type="button"
              onClick={() => setIsCancelOpen(true)}
              className="text-sm font-medium text-ink-muted transition-colors hover:text-ink"
            >
              Ganti metode pembayaran
            </button>
          </div>
        </section>

        <section
          aria-labelledby="demo-title"
          className="rounded-card border border-dashed border-line p-5"
        >
          <div className="flex items-center gap-2">
            <FlaskConical className="size-4 text-ink-subtle" />
            <h2 id="demo-title" className="text-sm font-medium md:text-sm">
              Simulasi prototype
            </h2>
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            Menggantikan konfirmasi otomatis dari bank. Tidak muncul di versi produksi.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="pill"
              disabled={simulate.isPending}
              onClick={() => simulate.mutate({ orderId: order.id, outcome: 'paid' })}
            >
              Pembayaran masuk
            </Button>
            <Button
              variant="outline"
              size="pill"
              disabled={simulate.isPending}
              onClick={() => simulate.mutate({ orderId: order.id, outcome: 'expired' })}
            >
              Lewati batas waktu
            </Button>
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <OrderSummary caseInfo={summary.caseInfo} adminFee={order.adminFee}>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Invoice</dt>
              <dd className="font-mono text-xs text-ink">{order.invoiceNumber}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Dibuat</dt>
              <dd className="font-mono text-xs text-ink">{formatDateTime(order.createdAt)}</dd>
            </div>
          </dl>
        </OrderSummary>
      </aside>

      <ConfirmDialog
        isOpen={isCancelOpen}
        onOpenChange={setIsCancelOpen}
        title="Ganti metode pembayaran?"
        description="Nomor virtual account ini akan dibatalkan. Jangan transfer ke nomor ini setelah dibatalkan."
        confirmLabel="Batalkan dan ganti"
        onConfirm={() => cancelOrder.mutate(order.id, { onSuccess: () => setIsCancelOpen(false) })}
        isPending={cancelOrder.isPending}
      />
    </div>
  );
}
